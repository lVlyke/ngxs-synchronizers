import { Type } from "@angular/core";
import { Action, State, StateContext } from "@ngxs/store";

// From NGXS - Not exposed publicly
interface StoreOptions<T> {
    name: string;
    defaults?: T;
    children?: any[];
}

const UPDATE_ACTION_FN_NAME = Symbol("$UPDATE_ACTION_FN");
const PARENT_REF_KEY = Symbol("$PARENT_REF_KEY");

export function SyncState<T>(options: StoreOptions<T>): ClassDecorator {

    return function(constructor: SyncState.Class) {
        // Add the update action function to the class
        Object.defineProperty(constructor.prototype, UPDATE_ACTION_FN_NAME, {
            configurable: false,
            enumerable: true,
            value<StateT, PropertyT>(context: StateContext<StateT>, { property, payload }: SyncState.UpdateAction<StateT, PropertyT>) {
                context.patchState({ [property]: payload } as any);
            }
        });

        // Apply the @Action() decorator to the new function
        Action(SyncState.UpdateAction.For(constructor))(
            constructor.prototype,
            UPDATE_ACTION_FN_NAME,
            Object.getOwnPropertyDescriptor(constructor.prototype, UPDATE_ACTION_FN_NAME)
        );

        // Add parent metadata to the child store
        options.children.forEach(child => {
            Object.defineProperty(child, PARENT_REF_KEY, {
                configurable: false,
                value: constructor
            });
        });

        // Apply the @State() decorator to the class
        State<T>(options)(constructor);
    } as any;
}

export namespace SyncState {

    export interface ClassMetadata {
        stateName: string;
    }

    export type Class = Type<any> & ClassMetadata;

    export namespace Class {

        export function resolveParent($class: Class): Class {
            const parentDescriptor = Object.getOwnPropertyDescriptor($class, PARENT_REF_KEY);
            return parentDescriptor ? parentDescriptor.value : undefined;
        }

        export function resolveParents($class: Class): Class[] {
            const parent = resolveParent($class);
            return parent ? [parent, ...resolveParents(parent)] : [];
        }
    }

    export class UpdateAction<StateT, PropertyT> {
        constructor(
            public readonly property: keyof StateT,
            public readonly payload: PropertyT
        ) {}
    }

    export namespace UpdateAction {

        export interface Creator<StateT, PropertyT> {
            type: string;

            new(...args: any[]): UpdateAction<StateT, PropertyT>;
        }

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
