import { Action, State, StateContext } from "@ngxs/store";

// From NGXS - Not exposed publicly
export interface StoreOptions<T> {
    name: string;
    defaults?: T;
    children?: any[];
}

export const UPDATE_ACTION_FN_NAME = "$$updateProperty";

export function SyncState<T>(options: StoreOptions<T>): ClassDecorator {

    return function(constructor: SyncState.Class) {
        // Add the update action function to the class
        constructor.prototype[UPDATE_ACTION_FN_NAME] = function<StateT, PropertyT>(context: StateContext<StateT>, { property, payload }: SyncState.UpdateAction<StateT, PropertyT>) {
            context.patchState({ [property]: payload } as any);
        };

        // Apply the @Action() decorator to the new function
        Action(SyncState.UpdateAction.For(constructor))(
            constructor.prototype,
            UPDATE_ACTION_FN_NAME,
            Object.getOwnPropertyDescriptor(constructor.prototype, UPDATE_ACTION_FN_NAME)
        );

        // Apply the @State() decorator to the class
        State(options)(constructor);
    } as any;
}

export namespace SyncState {

    export type Class = (new(property: keyof Class, payload: Class[keyof Class]) => any) & { stateName: string; };

    export class UpdateAction<StateT, PropertyT> {
        constructor(
            public readonly property: keyof StateT,
            public readonly payload: PropertyT
        ) {}
    }

    export namespace UpdateAction {

        export type Creator<StateT, PropertyT> = new(...args: any[]) => UpdateAction<StateT, PropertyT>;

        const updateActions = new Map<Class, Creator<any, any>>();

        export function For<StateT, PropertyT>($class: Class): Creator<StateT, PropertyT> {
            if (!updateActions.has($class)) {
                updateActions.set($class, class extends UpdateAction<StateT, PropertyT> {
                    public static readonly type: string = `[${$class.stateName} sync] Update field`;
                });
            }

            return updateActions.get($class);
        }
    }
}
