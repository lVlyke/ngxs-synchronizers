import { Type as ClassType } from "@angular/core";
import { Action, State, StateContext } from "@ngxs/store";
import { SynchronizerDictionary } from "../synchronizer/synchronizer-dictionary";

// From NGXS - Not exposed publicly
interface StoreOptions<T> {
    name: string;
    defaults?: T;
    children?: any[];
}

export interface SyncStoreOptions<T> extends StoreOptions<T> {
    synchronizers?: SynchronizerDictionary<T>;
}

export function SyncState<T>(options: SyncStoreOptions<T>): ClassDecorator {

    return function(constructor: SyncState.Class<T>) {
        // Record the store options
        SyncState.Class.setStoreOptions<T>(constructor, options);

        // Bootstrap the actions for the store
        SyncState.UpdateAction.bootstrapClass(constructor);

        // Record the parent store class for any child stores
        options.children.forEach(child => SyncState.Class.setParent(child, constructor));

        // Apply the @State() decorator to the class
        State<T>(options)(constructor);
    } as any;
}

export namespace SyncState {

    const NGXS_SYNCHRONIZERS_METADATA_KEY = Symbol("$NGXS_SYNCHRONIZERS_METADATA");
    const PARENT_REF_KEY = Symbol("$PARENT_REF");
    const SYNC_STORE_OPTIONS_KEY = Symbol("$SYNC_STORE_OPTIONS");

    interface Metadata<T> {
        [SYNC_STORE_OPTIONS_KEY]: SyncStoreOptions<T>;
        [PARENT_REF_KEY]?: any;
    }

    function metadata<T>(stateRef: any): Metadata<T> {
        const descriptor = Object.getOwnPropertyDescriptor(stateRef, NGXS_SYNCHRONIZERS_METADATA_KEY);

        if (!descriptor) {
            Object.defineProperty(stateRef, NGXS_SYNCHRONIZERS_METADATA_KEY, {
                configurable: false,
                enumerable: false,
                value: {}
            });

            return metadata<T>(stateRef);
        }

        return descriptor.value;
    }

    export interface Class<T> extends ClassType<any> {
        stateName: string;
        [NGXS_SYNCHRONIZERS_METADATA_KEY]: Metadata<T>;
    }

    export namespace Class {

        export function getStoreOptions<T>($class: Class<T>): SyncStoreOptions<T> {
            return metadata<T>($class)[SYNC_STORE_OPTIONS_KEY];
        }

        export function setStoreOptions<T>($class: Class<T>, options: SyncStoreOptions<T>): void {
            metadata<T>($class)[SYNC_STORE_OPTIONS_KEY] = options;
        }

        export function resolveParent<T>($class: Class<T>): Class<unknown> {
            return metadata<T>($class)[PARENT_REF_KEY];
        }

        export function resolveParents<T>($class: Class<T>): Class<unknown>[] {
            const parent = resolveParent($class);
            return parent ? [parent, ...resolveParents(parent)] : [];
        }

        export function setParent<T>($childClass: Class<unknown>, $parentClass: Class<T>): void {
            metadata<T>($childClass)[PARENT_REF_KEY] = $parentClass;
        }
    }

    export class UpdateAction<StateT, PropertyT extends keyof StateT> {
        public static readonly type: string;

        constructor(
            public readonly property: PropertyT,
            public readonly payload: StateT[PropertyT]
        ) {}
    }

    export namespace UpdateAction {

        interface Type<StateT, PropertyT extends keyof StateT> {
            type: string;

            new(property: PropertyT, payload: StateT[PropertyT]): UpdateAction<StateT, PropertyT>;
        }

        const UPDATE_ACTION_FN_KEY = Symbol("$UPDATE_ACTION_FN");
        const updateActions = new Map<Class<any>, Type<any, any>>();

        export function bootstrapClass<StateT>($class: Class<StateT>): void {
            // Add the update action function to the class
            Object.defineProperty($class.prototype, UPDATE_ACTION_FN_KEY, {
                configurable: false,
                enumerable: true,
                value<PropertyT extends keyof StateT>(context: StateContext<StateT>, { property, payload }: SyncState.UpdateAction<StateT, PropertyT>) {
                    context.patchState({ [property]: payload } as any);
                }
            });

            // Apply the @Action() decorator to the new function
            Action(Type<StateT>($class))(
                $class.prototype,
                UPDATE_ACTION_FN_KEY,
                Object.getOwnPropertyDescriptor($class.prototype, UPDATE_ACTION_FN_KEY)
            );
        }

        export function Type<StateT, PropertyT extends keyof StateT = keyof StateT>($class: Class<StateT>): Type<StateT, PropertyT> {
            if (!updateActions.has($class)) {
                updateActions.set($class, class extends UpdateAction<StateT, PropertyT> {
                    public static readonly type: string = `[${$class.stateName} sync] Update field`;
                });
            }

            return updateActions.get($class);
        }
    }
}
