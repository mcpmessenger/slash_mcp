#!/usr/bin/env node
import WebSocket from 'ws';

const SERVER_URL = process.env.MCP_URL || 'ws://localhost:8080';

function waitOpen(ws){return new Promise((res,rej)=>{ws.on('open',res);ws.on('error',rej);});}
function sendRpc(ws,msg){return new Promise((resolve)=>{const id=msg.id;const listener=(data)=>{try{const res=JSON.parse(data);if(res.id===id){ws.off('message',listener);resolve(res);}}catch{}};ws.on('message',listener);ws.send(JSON.stringify(msg));});}

(async()=>{
  const wsA=new WebSocket(SERVER_URL);
  const wsB=new WebSocket(SERVER_URL);
  await Promise.all([waitOpen(wsA),waitOpen(wsB)]);
  console.log('Both sockets connected');

  const connA='connA-'+Date.now();
  const connB='connB-'+Date.now();
  await Promise.all([
    sendRpc(wsA,{jsonrpc:'2.0',id:1,method:'mcp_register',params:{connectionId:connA}}),
    sendRpc(wsB,{jsonrpc:'2.0',id:2,method:'mcp_register',params:{connectionId:connB}}),
  ]);

  // 1. forward ping command from A->B
  const innerId=100;
  const outerId=101;
  const pingCmd='ping -c 2 example.com';
  const forwardResp=await sendRpc(wsA,{jsonrpc:'2.0',id:outerId,method:'mcp_forward',params:{targetConnectionId:connB,request:{jsonrpc:'2.0',id:innerId,method:'mcp_invokeTool',params:{toolName:'shell_execute',parameters:{command:pingCmd}}}}});
  if(forwardResp.error){console.error('Forward failed',forwardResp.error);process.exit(1);} 

  // track execId and streaming
  let execId=null;let streamChunks=0;let execStatus=null;
  const listener=(data)=>{try{const msg=JSON.parse(data);
    if(msg.id===innerId&&msg.result&&msg.result.execId){execId=msg.result.execId;}
    if(msg.method==='mcp_streamOutput'&&msg.params?.execId===execId){streamChunks++;}
    if(msg.method==='mcp_execComplete'&&msg.params?.execId===execId){execStatus=msg.params.status;}
  }catch{}};
  wsA.on('message',listener);

  // wait up to 7s for completion
  await new Promise(res=>setTimeout(res,7000));
  wsA.off('message',listener);

  const forwardPass=execStatus==='success'&&streamChunks>0;

  // 2. resource round-trip
  const textContent='hello integration';
  const sendRes=await sendRpc(wsB,{jsonrpc:'2.0',id:200,method:'mcp_sendResource',params:{type:'text',content:textContent}});
  const resId=sendRes.result?.resourceId;
  let fetchOk=false;
  if(resId){
    const fetch=await sendRpc(wsA,{jsonrpc:'2.0',id:201,method:'mcp_getResource',params:{resourceId:resId}});
    fetchOk=fetch.result?.id===resId;
  }

  wsA.close();wsB.close();

  console.table([{test:'forward & stream',pass:forwardPass,chunks:streamChunks,status:execStatus},{test:'resource roundtrip',pass:fetchOk}]);

  process.exit(forwardPass&&fetchOk?0:1);
})(); 