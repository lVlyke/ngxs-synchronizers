import { Action, StateContext, State } from "@ngxs/store";

// From NGXS - Not exposed publicly
export interface StoreOptions<T> {
    name: string;
    defaults?: T;
    children?: any[];
}

export const UPDATE_ACTION_FN_NAME = "$$updateProperty";

export function SyncState<T>(options: StoreOptions<T>): ClassDecorator {

    return function(constructor: new(...args: any[]) => Object) {
        // Add the update action function to the class
        constructor.prototype[UPDATE_ACTION_FN_NAME] = function<StateT, PropertyT>(context: StateContext<StateT>, { property, payload }: SyncState.UpdateAction<StateT, PropertyT>) {
            context.patchState(<any>{ [property]: payload });
        };

        // Apply the @Action() decorator to the new function
        Action(SyncState.UpdateAction)(
            constructor.prototype,
            UPDATE_ACTION_FN_NAME,
            Object.getOwnPropertyDescriptor(constructor.prototype, UPDATE_ACTION_FN_NAME)
        );

        // Apply the @State() decorator to the class
        State(options)(constructor);
    } as any;
}

export namespace SyncState {

    export class UpdateAction<StateT, PropertyT> {
        public static readonly type = `[SyncState] Update field`;

        constructor(
            public readonly property: keyof StateT,
            public readonly payload: PropertyT
        ) {}
    }
}