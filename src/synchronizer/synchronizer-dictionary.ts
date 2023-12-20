import { Injector, Type } from "@angular/core";
import { CollectionSynchronizer } from "./collection-synchronizer";
import { PropertySynchronizer } from "./property-synchronizer";
import { Synchronizer } from "./synchronizer";

export type SynchronizerDictionary<T> = {
    [P in keyof T]?: Type<PropertySynchronizer<T, P>>;
} | Type<CollectionSynchronizer<T>>;

export namespace SynchronizerDictionary {

    export function keys<T>(dict: SynchronizerDictionary<T>): Array<keyof T> {
        return isCollectionSynchronizer(dict) ? [] : Object.keys(dict || {}) as Array<keyof T>;
    }

    export function isCollectionSynchronizer<T>(
        dict: SynchronizerDictionary<T>
    ): dict is Type<CollectionSynchronizer<T>> {
        /* eslint-disable @typescript-eslint/no-unsafe-member-access */
        return typeof (dict as Type<CollectionSynchronizer<T>>)?.prototype?.read === "function";
    }

    export function resolveSynchronizer<T>(
        dict: SynchronizerDictionary<T>,
        propKey: keyof T
    ): Type<Synchronizer<T, keyof T, unknown, unknown>> | undefined {
        return isCollectionSynchronizer(dict) ? dict : dict[propKey];
    }

    export function resolveSynchronizerInstance<T>(
        injector: Injector,
        dict: SynchronizerDictionary<T>,
        propKey: keyof T
    ): Synchronizer<T, keyof T, unknown, unknown> {
        const synchronizerDef = resolveSynchronizer(dict, propKey);

        if (!!synchronizerDef) {
            return injector.get(synchronizerDef);
        } else {
            throw new Error(`A Synchronizer has not been defined for property '${String(propKey)}.`);
        }
    }
}
