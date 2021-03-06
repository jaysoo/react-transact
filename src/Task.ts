import { IAction, IActionThunk, IComputation, ITask } from './interfaces'

class Task<A,B> implements ITask<A,B> {
  computation: IComputation<A,B>

  static resolve<B>(action: IAction<B>): ITask<any,B> {
    return new Task((__: IActionThunk<any>, res: IActionThunk<B>) => {
      res(action)
    })
  }

  static reject<A>(action: IAction<A>): ITask<A,any> {
    return new Task((rej: IActionThunk<A>, __: IActionThunk<any>) => {
      rej(action)
    })
  }

  constructor(computation: IComputation<A,B>) {
    this.computation = computation
  }

  fork(rejOrCombined: IActionThunk<A|B>, res?: IActionThunk<B>): void {
    if (typeof res === 'function') {
      this.computation(
        (a: IAction<A>): void => rejOrCombined(a),
        (b: IAction<B>): void => res(b)
      )
    } else {
      this.computation(
        (a: IAction<A>): void => rejOrCombined(a),
        (b: IAction<B>): void => rejOrCombined(b)
      )
    }
  }

  chain<A2,B2>(g: (arg: any)=> ITask<A2,B2>): ITask<A|A2,B2> {
    return new Task((rej: IActionThunk<A|A2>, res: IActionThunk<B2>) => {
      this.fork(
        (action: IAction<A>) => {
          rej(action)
        },
        (action: IAction<B>) => {
          g(action.payload).fork(
            (action: IAction<A2>) => rej(action),
            (action: IAction<B2>) => res(action)
          )
        }
      )
    })
  }

  map(g: (arg: any)=> any): ITask<A,B> {
    return new Task((rej: IActionThunk<A>, res: IActionThunk<B>) => {
      this.fork(
        (action: IAction<A>) => rej(action),
        (action: IAction<B>) => {
          const valueOrPromise = g(action.payload)
          if (typeof valueOrPromise.then === 'function') {
            valueOrPromise.then((value) => {
              res({
                type: action.type,
                payload: value
              })
            })
          } else {
            res({
              type: action.type,
              payload: valueOrPromise
            })
          }
        }
      )
    })
  }
}

export default Task
