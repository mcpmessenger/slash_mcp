import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

export const Walkthrough: React.FC = () => {
  const [run, setRun] = React.useState(false);
  React.useEffect(() => {
    const seen = localStorage.getItem('joyride_seen');
    if (!seen) setRun(true);
  }, []);

  const steps: Step[] = [
    {
      target: 'aside',
      content: 'This sidebar lets you manage connections, resources, tools and prompts.',
    },
    {
      target: 'button[aria-label="Collapse"],button[aria-label="Expand"]',
      content: 'Click here to collapse or expand the sidebar.',
    },
    {
      target: 'header',
      content:
        'Use the settings icon to open the configuration page where you can add API keys and Supabase credentials.',
    },
    {
      target: 'textarea',
      content: 'This is the command input. Try typing `ping google.com` then hit Enter.',
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      localStorage.setItem('joyride_seen', 'yes');
      setRun(false);
    }
  };

  if (!run) return null;
  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleCallback}
    />
  );
};
