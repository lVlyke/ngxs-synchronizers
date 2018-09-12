import { Action, StateContext, State } from "@ngxs/store";

// From NGXS - Not exposed publicly
export interface StoreOptions<T> {
    name: string;
    defaults?: T;
    children?: any[];
}

export function SynchronizerState<T>(options: StoreOptions<T>): ClassDecorator {

    return function(constructor: new(...args: any[]) => Object) {
        
        @State(options)
        class Class extends constructor {

            @Action(SynchronizerState.UpdateAction)
            public updateProperty<StateT, PropertyT>(context: StateContext<StateT>, { property, payload }: SynchronizerState.UpdateAction<StateT, PropertyT>) {
                context.patchState(<any>{ [property]: payload });
            }
        };

        return Class;
    } as any;
}

export namespace SynchronizerState {

    export class UpdateAction<StateT, PropertyT> {
        public static readonly type = `[SynchronizerState] Update field`;

        constructor(
            public readonly property: keyof StateT,
            public readonly payload: PropertyT
        ) {}
    }
}