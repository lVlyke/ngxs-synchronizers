import { Observable } from "rxjs";

export interface Synchronizer<
    T,
    PropKey extends keyof T,
    ParamsT = any
> {
    requiredProperties?: Array<keyof T>;
    proxy?: boolean;

    read(
        requiredDetails?: Partial<T>,
        options?: Synchronizer.ReadOptions<T, PropKey, ParamsT>
    ): Observable<T[PropKey]>;
}

export interface PropertySynchronizer<
    T,
    PropKey extends keyof T,
    ParamsT = any
> extends Synchronizer<T, PropKey, ParamsT> {
    property: PropKey;

    read(
        requiredDetails?: Partial<T>,
        options?: PropertySynchronizer.ReadOptions<T, PropKey, ParamsT>
    ): Observable<T[PropKey]>;
}

export interface CollectionSynchronizer<
    T,
    ParamsT = any
> extends Synchronizer<T, keyof T, ParamsT> {
    read(
        requiredDetails?: Partial<T>,
        options?: CollectionSynchronizer.ReadOptions<T, ParamsT>
    ): Observable<T[keyof T]>;
}

export namespace Synchronizer {

    export interface Options<ParamsT = any> {
        requestParams?: ParamsT;
        clearStore?: boolean;
    }

    export interface ReadOptions<
        T,
        PropKey extends keyof T,
        ParamsT = any
    > extends Options<ParamsT> {
        propertyName: PropKey;
    }

    export interface ICollection<T> {
        setSynchronizer<ParamsT = any>(stateProperty: keyof T, synchronizer: Synchronizer<T, typeof stateProperty, ParamsT>): void;
        getSynchronizer<ParamsT = any>(stateProperty: keyof T): Synchronizer<T, typeof stateProperty, ParamsT>;
    }
}

export namespace PropertySynchronizer {

    export type Dictionary<T> = {
        [P in keyof T]?: PropertySynchronizer<T, P>;
    };

    export type ReadOptions<
        T = any,
        PropKey extends keyof T = keyof T,
        ParamsT = any
    > = Synchronizer.ReadOptions<T, PropKey, ParamsT>;

    export class Collection<T> implements Synchronizer.ICollection<T> {
        protected _synchronizers: Dictionary<T> = {};

        constructor(...args: PropertySynchronizer<T, any>[]) {
            // Create the dictionary from the list of synchronizers
            this._synchronizers = args.reduce((synchronizers: Dictionary<T>, synchronizer: PropertySynchronizer<T, any>) => {
                return Object.assign(synchronizers, { [synchronizer.property]: synchronizer });
            }, {});
        }

        public get synchronizers(): Dictionary<T> {
            return this._synchronizers;
        }

        public setSynchronizer<ParamsT = any>(stateProperty: keyof T, synchronizer: PropertySynchronizer<T, typeof stateProperty, ParamsT>) {
            this._synchronizers[stateProperty] = synchronizer;
        }

        public getSynchronizer<ParamsT = any>(stateProperty: keyof T): PropertySynchronizer<T, typeof stateProperty, ParamsT> {
            const synchronizer = this._synchronizers[stateProperty] as PropertySynchronizer<T, typeof stateProperty, ParamsT>;

            if (synchronizer) {
                return synchronizer;
            } else {
                throw new Error(`No Synchronizer defined for state property "${stateProperty}".`);
            }
        }
    }
}

export namespace CollectionSynchronizer {

    export type Dictionary<T> = CollectionSynchronizer<T>;

    export type ReadOptions<
        T = any,
        ParamsT = any
    > = Synchronizer.ReadOptions<T, keyof T, ParamsT>;

    export class Collection<T> implements Synchronizer.ICollection<T> {

        constructor(private synchronizer: CollectionSynchronizer<T>) {}

        public get synchronizers(): Dictionary<T> {
            return this.synchronizer;
        }

        public setSynchronizer<ParamsT = any>(_stateProperty: keyof T, synchronizer: CollectionSynchronizer<T, ParamsT>): void {
            this.synchronizer = synchronizer;
        }

        public getSynchronizer<ParamsT = any>(_stateProperty: keyof T): CollectionSynchronizer<T, ParamsT> {
            return this.synchronizer;
        }
    }
}
