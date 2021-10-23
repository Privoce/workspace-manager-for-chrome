import * as React from 'react';
import style from '@/style/default.module.less';

const myFunction = (a: number, b: number): number => a + b;

const MyComponent: React.FC = () => <h1 className={style.text}>This is a sample React component.</h1>;

export { myFunction, MyComponent };
