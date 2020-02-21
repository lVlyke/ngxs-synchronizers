import { Type } from "@angular/core";
import { CollectionSynchronizer } from "./collection-synchronizer";
import { PropertySynchronizer } from "./property-synchronizer";
import { Synchronizer } from "./synchronizer";

export type SynchronizerDictionary<T> = {
    [P in keyof T]?: Type<PropertySynchronizer<T, P>>;
} | Type<CollectionSynchronizer<T>>;

export namespace SynchronizerDictionary {

    export function isCollectionSynchronizer<T>(dict: SynchronizerDictionary<T>): dict is Type<CollectionSynchronizer<T>> {
        return typeof (dict as Type<CollectionSynchronizer<T>>)?.prototype?.read === "function";
    }

    export function resolveSynchronizer<T>(dict: SynchronizerDictionary<T>, propKey: keyof T): Type<Synchronizer<T, keyof T>> {
        return isCollectionSynchronizer(dict) ? dict : dict[propKey];
    }
}
