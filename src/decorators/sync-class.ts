import { Type as ClassType } from "@angular/core";
import { SynchronizerDictionary } from "../synchronizer/synchronizer-dictionary";

const NGXS_SYNCHRONIZERS_METADATA_KEY = Symbol("$NGXS_SYNCHRONIZERS_METADATA");
const PARENT_REF_KEY = Symbol("$PARENT_REF");
const SYNC_STORE_OPTIONS_KEY = Symbol("$SYNC_STORE_OPTIONS");

// From NGXS - Not exposed publicly
interface StoreOptions<T> {
    name: string;
    defaults?: T;
    children?: any[];
}

interface Metadata<T> {
    [SYNC_STORE_OPTIONS_KEY]: SyncStoreOptions<T>;
    [PARENT_REF_KEY]?: any;
}

export interface SyncStoreOptions<T> extends StoreOptions<T> {
    synchronizers?: SynchronizerDictionary<T>;
}

export interface SyncClass<T> extends ClassType<any> {
    [NGXS_SYNCHRONIZERS_METADATA_KEY]?: Metadata<T>;
}

export namespace SyncClass {

    export function getStoreOptions<T>($class: SyncClass<T>): SyncStoreOptions<T> {
        return metadata<T>($class)[SYNC_STORE_OPTIONS_KEY];
    }

    export function setStoreOptions<T>($class: SyncClass<T>, options: SyncStoreOptions<T>): void {
        metadata<T>($class)[SYNC_STORE_OPTIONS_KEY] = options;
    }

    export function resolveParent<T>($class: SyncClass<T>): SyncClass<unknown> {
        return metadata<T>($class)[PARENT_REF_KEY];
    }

    export function resolveParents<T>($class: SyncClass<T>): SyncClass<unknown>[] {
        const parent = resolveParent($class);
        return parent ? [parent, ...resolveParents(parent)] : [];
    }

    export function setParent<T>($childClass: SyncClass<unknown>, $parentClass: SyncClass<T>): void {
        metadata<T>($childClass)[PARENT_REF_KEY] = $parentClass;
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
}
