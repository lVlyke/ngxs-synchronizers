import { Action, State, StateContext } from "@ngxs/store";
import { SyncClass, SyncStoreOptions } from "./sync-class";

export function SyncState<T>(options: SyncStoreOptions<T>): ClassDecorator {

    return function(constructor: SyncClass<T>) {
        // Record the store options
        SyncClass.setStoreOptions<T>(constructor, options);

        // Bootstrap the actions for the store
        SyncState.UpdateAction.bootstrapClass(constructor);

        // Record the parent store class for any child stores
        if (options.children) {
            options.children.forEach(child => SyncClass.setParent(
                child as SyncClass<unknown>,
                constructor
            ));
        }

        // Apply the @State() decorator to the class
        State<T>(options)(constructor);
    } as any as ClassDecorator;
}

export namespace SyncState {

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
        const updateActions = new Map<SyncClass<unknown>, Type<any, any>>();

        export function bootstrapClass<StateT>($class: SyncClass<StateT>): void {
            // Add the update action function to the class
            Object.defineProperty($class.prototype, UPDATE_ACTION_FN_KEY, {
                configurable: false,
                enumerable: true,
                value<PropertyT extends keyof StateT>(
                    context: StateContext<StateT>,
                    { property, payload }: SyncState.UpdateAction<StateT, PropertyT>
                ) {
                    if (context.getState() === undefined || context.getState() === null) {
                        context.setState({ [property]: payload } as StateT);
                    } else {
                        context.patchState({ [property]: payload } as StateT);
                    }
                }
            });

            // Apply the @Action() decorator to the new function
            Action(Type<StateT>($class))(
                $class.prototype as object,
                UPDATE_ACTION_FN_KEY,
                Object.getOwnPropertyDescriptor($class.prototype, UPDATE_ACTION_FN_KEY)!
            );
        }

        export function Type<StateT, PropertyT extends keyof StateT = keyof StateT>(
            $class: SyncClass<StateT>
        ): Type<StateT, PropertyT> {
            if (!updateActions.has($class)) {
                const opts = SyncClass.getStoreOptions($class);
                updateActions.set($class, class extends UpdateAction<StateT, PropertyT> {
                    public static readonly type: string = `[${opts.name} sync] Update field`;
                });
            }

            return updateActions.get($class)! as Type<StateT, PropertyT>;
        }
    }
}
