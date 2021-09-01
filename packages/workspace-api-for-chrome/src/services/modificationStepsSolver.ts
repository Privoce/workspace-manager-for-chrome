export type ISrcItem<I, C> = {
  id: I;
  content: C;
};

export type IDstItem<C> = {
  content: C;
};

type IWithSrcIndex = {
  srcIndex: number;
};

type IWithDstIndex = {
  dstIndex: number;
};

type IComparisonResult<I, C> = {
  srcOnly: (ISrcItem<I, C> & IWithSrcIndex)[];
  dstOnly: (IDstItem<C> & IWithDstIndex)[];
  both: (ISrcItem<I, C> & IWithSrcIndex & IWithDstIndex)[];
};

type IRemovalStep<I> = {
  id: I;
};

type IMovingStep<I> = {
  id: I;
  index: number;
};

type IUpdatingStep<I, C> = {
  id: I;
  content: C;
};

type ICreationStep<C> = {
  content: C;
  index: number;
};

type IModificationSteps<I, C> = {
  removalSteps: IRemovalStep<I>[];
  movingSteps: IMovingStep<I>[];
  updatingSteps: IUpdatingStep<I, C>[];
  creationSteps: ICreationStep<C>[];
};

export class ModificationStepsSolver<I, C> {
  private compareLists = (src: ISrcItem<I, C>[], dst: IDstItem<C>[]): IComparisonResult<I, C> => {
    const result: IComparisonResult<I, C> = {
      srcOnly: [],
      dstOnly: [],
      both: [],
    };
    const srcMappedIndices: number[] = [];
    // scan for intersection
    dst.forEach((dstItem, dstIndex) => {
      const found = src.some((srcItem, srcIndex) => {
        if (dstItem.content === srcItem.content && !srcMappedIndices.includes(srcIndex)) {
          result.both.push({
            ...srcItem,
            srcIndex,
            dstIndex,
          });
          srcMappedIndices.push(srcIndex);
          return true;
        }
      });
      if (!found) {
        result.dstOnly.push({
          ...dstItem,
          dstIndex,
        });
      }
    });
    // process the residual of src
    src.forEach((srcItem, srcIndex) => {
      if (!srcMappedIndices.includes(srcIndex)) {
        result.srcOnly.push({
          ...srcItem,
          srcIndex,
        });
      }
    });
    return result;
  };

  public getModificationSteps = (src: ISrcItem<I, C>[], dst: IDstItem<C>[]): IModificationSteps<I, C> => {
    const result: IModificationSteps<I, C> = {
      removalSteps: [],
      movingSteps: [],
      updatingSteps: [],
      creationSteps: [],
    };
    let comparisonResult = this.compareLists(src, dst);
    let { srcOnly, dstOnly, both } = comparisonResult;
    const reCompare = () => {
      comparisonResult = this.compareLists(src, dst);
      srcOnly = comparisonResult.srcOnly;
      dstOnly = comparisonResult.dstOnly;
      both = comparisonResult.both;
    };

    // get removal steps
    // if `srcOnly` is longer, remove the excess part
    if (srcOnly.length > dstOnly.length) {
      // get steps
      const removalSteps = srcOnly.slice(dstOnly.length, srcOnly.length).map((item) => ({
        id: item.id,
      }));
      result.removalSteps = removalSteps;
      // update `src` and re-compare
      src = src.filter((item) => !removalSteps.map((step) => step.id).includes(item.id));
      reCompare();
    }

    // get creation steps
    // since the `srcOnly` has been truncated, `srcOnly.length` must be smaller than or equal to `dstOnly.length`
    if (srcOnly.length < dstOnly.length) {
      result.creationSteps = dstOnly.slice(srcOnly.length).map((item) => ({
        content: item.content,
        index: item.dstIndex,
      }));
      // update `dst` and re-compare
      dst = dst.filter((_, index) => !result.creationSteps.map((item) => item.index).includes(index));
      reCompare();
    }

    // get moving steps
    // now `srcOnly.length` must be equal to `dstOnly.length`
    let movingSteps: IMovingStep<I>[] = [];
    // get steps from `both`
    both.forEach((item) => {
      movingSteps.push({
        id: item.id,
        index: item.dstIndex,
      });
    });
    // get steps from `srcOnly` and `dstOnly`
    dstOnly.forEach((dstOnlyItem, index) => {
      const srcOnlyItem = srcOnly[index];
      movingSteps.push({
        id: srcOnlyItem.id,
        index: dstOnlyItem.dstIndex,
      });
    });
    // sort steps by index
    movingSteps = movingSteps.sort((a, b) => a.index - b.index);
    // filter steps and update `src` and re-compare
    movingSteps.forEach((tmpStep) => {
      // locate target in `src` and get its index
      const realIndex = src.map((item) => item.id).indexOf(tmpStep.id);
      // check if moving is necessary
      if (realIndex !== tmpStep.index) {
        // add this step
        result.movingSteps.push(tmpStep);
        // update `src`
        src = ([] as ISrcItem<I, C>[]).concat(
          src.slice(0, tmpStep.index),
          [src[realIndex]],
          src.slice(tmpStep.index, realIndex),
          src.slice(realIndex + 1)
        );
      }
    });
    reCompare();

    // get updating steps
    // get steps from `dstOnly` and `srcOnly`
    dstOnly.forEach((dstOnlyItem, index) => {
      const srcOnlyItem = srcOnly[index];
      result.updatingSteps.push({
        id: srcOnlyItem.id,
        content: dstOnlyItem.content,
      });
    });

    return result;
  };
}
