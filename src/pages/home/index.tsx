import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Alert, Button, Card, Col, Form, Row, Space } from 'antd';
import Workspace from 'workspace-api-for-chrome';

import style from './index.module.less';
import { action, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react';
import { Helmet } from 'react-helmet';

/**
 * Type Definitions and Constants
 */

/**
 * Components
 */

const ColoredLabel: React.FC<{ value: boolean }> = ({ value }) => (
  <span className={value ? style.positiveText : style.negativeText}>{value ? 'Created' : 'Not Created'}</span>
);

@observer
class App extends React.Component<Record<string, never>, Record<string, never>> {
  showAlert: boolean;
  winIds: [number, number];
  workspaces: [Workspace, Workspace];

  constructor(props: Record<string, never> | Readonly<Record<string, never>>) {
    super(props);
    this.showAlert = true;
    this.winIds = [-1, -1];
    this.workspaces = [null, null];
    makeObservable(this, {
      showAlert: observable,
      winIds: observable,
      afterCloseHandler: action,
      setWinId: action,
    });
  }

  afterCloseHandler = () => {
    this.showAlert = false;
  };

  setWinId = (index: 0 | 1, winId: number) => {
    this.winIds[index] = winId;
  };

  createHandler = async (index: 0 | 1) => {
    if (this.winIds[index] !== -1) {
      return;
    }
    const winId = await new Promise<number>((resolve) => {
      chrome.windows.create(
        {
          state: 'maximized',
        },
        (window) => {
          resolve(window.id);
        }
      );
    });
    this.setWinId(index, winId);
    this.workspaces[index] = new Workspace(winId, true);
    console.log(`Workspace ${index.toString()} created`);
  };

  destroyHandler = async (index: 0 | 1) => {
    if (this.winIds[index] === -1) {
      return;
    }
    await new Promise<void>((resolve) => {
      chrome.windows.remove(this.winIds[index], resolve);
    });
    this.setWinId(index, -1);
    this.workspaces[index].destroy();
    console.log(`Workspace ${index.toString()} destroyed`);
  };

  registerListenerHandler = async (index: 0 | 1) => {
    if (this.winIds[index] === -1) {
      return;
    }
    this.workspaces[index].addEventHandler((...params) => {
      console.log(`Workspace ${index.toString()}`, ...params);
    });
    console.log(`Workspace ${index.toString()} added event handler`);
  };

  readHandler = async (index: 0 | 1) => {
    if (this.winIds[index] === -1) {
      return;
    }
    console.log(`Workspace ${index.toString()}`, await this.workspaces[index].read());
  };

  readRawHandler = async (index: 0 | 1) => {
    if (this.winIds[index] === -1) {
      return;
    }
    console.log(`Workspace ${index.toString()}`, await this.workspaces[index].readRaw());
  };

  sync1To2Handler = async () => {
    await this.workspaces[1].write(await this.workspaces[0].read());
    console.log('synced Workspace 1 to 2');
  };

  sync2To1Handler = async () => {
    await this.workspaces[0].write(await this.workspaces[1].read());
    console.log('synced Workspace 2 to 1');
  };

  sync1To2TabOnlyHandler = async () => {
    await this.workspaces[1].write({
      tabs: (await this.workspaces[0].read()).tabs,
    });
    console.log('synced Workspace 1 to 2 (Tab Only)');
  };

  sync2To1TabOnlyHandler = async () => {
    await this.workspaces[0].write({
      tabs: (await this.workspaces[1].read()).tabs,
    });
    console.log('synced Workspace 2 to 1 (Tab Only)');
  };

  render() {
    return (
      <>
        <Helmet>
          <title>Control Panel | Workspace Manager</title>
        </Helmet>
        <div className={style.container}>
          {this.showAlert ? (
            <div className={style.alertContainer}>
              <Alert
                type="info"
                showIcon
                closable
                afterClose={this.afterCloseHandler}
                message={<strong>Tips for Use</strong>}
                description={
                  <>
                    To see the complete output, press <strong>F12</strong> to open the developer tools.
                  </>
                }
              />
            </div>
          ) : null}
          <Row className={style.row}>
            {this.winIds.map((id: number, index: 0 | 1) => (
              <Col key={index} span={12}>
                <Card title={`Workspace ${index === 0 ? '1' : '2'}`}>
                  <Form>
                    <Form.Item label="Status">
                      <ColoredLabel value={id !== -1} />
                    </Form.Item>
                    <Form.Item label="Window ID">{id.toString()}</Form.Item>
                    <Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          disabled={this.winIds[index] !== -1}
                          onClick={() => this.createHandler(index)}
                        >
                          Create
                        </Button>
                        <Button disabled={this.winIds[index] === -1} onClick={() => this.destroyHandler(index)}>
                          Destroy
                        </Button>
                      </Space>
                    </Form.Item>
                    <Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          disabled={this.winIds[index] === -1}
                          onClick={() => this.registerListenerHandler(index)}
                        >
                          Register Listener
                        </Button>
                        <Button disabled={this.winIds[index] === -1} onClick={() => this.readHandler(index)}>
                          Read
                        </Button>
                        <Button disabled={this.winIds[index] === -1} onClick={() => this.readRawHandler(index)}>
                          Read Raw
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            ))}
          </Row>
          <Row className={style.row}>
            <Col span={24}>
              <Card title="Data Sync">
                <Form>
                  <Form.Item>
                    <Space>
                      <Button disabled={this.winIds.includes(-1)} onClick={this.sync1To2Handler}>
                        1 to 2
                      </Button>
                      <Button disabled={this.winIds.includes(-1)} onClick={this.sync2To1Handler}>
                        2 to 1
                      </Button>
                      <Button disabled={this.winIds.includes(-1)} onClick={this.sync1To2TabOnlyHandler}>
                        1 to 2 (Tabs Only)
                      </Button>
                      <Button disabled={this.winIds.includes(-1)} onClick={this.sync2To1TabOnlyHandler}>
                        2 to 1 (Tabs Only)
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </div>
      </>
    );
  }
}

/**
 * Rendering and HMR Logics
 */

ReactDOM.render(<App />, document.getElementById('root'));

/* develblock:start */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (module.hot) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  module.hot.accept();
}
/* develblock:end */
