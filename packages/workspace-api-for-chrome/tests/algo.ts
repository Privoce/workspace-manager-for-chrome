import { ModificationStepsSolver, ISrcItem, IDstItem } from '../src/services/algo';

const mss = new ModificationStepsSolver<number, string>();

const makeSrc = (raw: string): ISrcItem<number, string>[] => {
  return raw.split('').map((char, index) => ({
    id: index,
    content: char,
  }));
};

const makeDst = (raw: string): IDstItem<string>[] => {
  return raw.split('').map((char) => ({
    content: char,
  }));
};

const testStr2Str = (src: string, dst: string): void => {
  console.log(`${src} => ${dst}`);
  console.log(mss.getModificationSteps(makeSrc(src), makeDst(dst)));
  console.log();
};

testStr2Str('ABC', 'ABBC');
testStr2Str('ABBC', 'ABC');
testStr2Str('ABC', 'ANC');
testStr2Str('ABC', 'CBA');
testStr2Str('Jack', 'OCJ');
testStr2Str('A', 'A');
