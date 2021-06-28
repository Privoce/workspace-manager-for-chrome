import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Button, Input, Space } from 'antd';
import { Workspace, ListenersService, WindowsService } from 'workspace-api-for-chrome';
import 'antd/dist/antd.less';
import style from './index.module.less';

const { TextArea } = Input;

const App: React.FC<Record<string, never>> = () => {
  const [input, setInput] = React.useState<string>('');
  const [output, setOutput] = React.useState<string>('');
  const workspace = React.useRef<Workspace>();
  const listenersService = React.useRef<ListenersService>();

  React.useEffect(() => {
    (async () => {
      const winId = await WindowsService.create('https://github.com/');
      workspace.current = new Workspace(winId);
    })();
    listenersService.current = new ListenersService(async () => {
      setOutput(await workspace.current?.read());
    });
  }, []);

  return (
    <div className={style.container}>
      <Space direction="vertical">
        <TextArea value={output} />
        <TextArea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
          }}
        />
        <Button
          onClick={() => {
            workspace.current?.write(input).then();
          }}
        >
          Write
        </Button>
      </Space>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
