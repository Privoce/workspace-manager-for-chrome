import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Logo } from '@/components/Logo';
import style from '@/style/default.module.less';

const App = () => (
  <div className={style.container}>
    <Logo />
    <h1>This is the Options page.</h1>
  </div>
);

ReactDOM.render(<App />, document.getElementById('root'));

/* eslint-disable @typescript-eslint/ban-ts-comment */
/* @ts-ignore */
if (module.hot) module.hot.accept();
