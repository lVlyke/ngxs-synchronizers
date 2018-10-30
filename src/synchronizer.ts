import { Observable } from "rxjs";

export interface Synchronizer<T, PropKey extends keyof T, ParamsT = any> {
    property: PropKey;
    requiredProperties?: Array<keyof T>;
    proxy?: boolean;

    read(requiredDetails?: Partial<T>, options?: Synchronizer.Options<ParamsT>): Observable<T[PropKey]>;
}

export namespace Synchronizer {

    export type Dictionary<T> = {
        [P in keyof T]?: Synchronizer<T, P>;
    };

    export interface Options<ParamsT = any> {
        requestParams?: ParamsT;
        clearStore?: boolean;
    }

    export class Collection<T> {
        protected _synchronizers: Dictionary<T> = {};

        constructor(...args: Synchronizer<T, any>[]) {
            // Create the dictionary from the list of synchronizers
            this._synchronizers = args.reduce((synchronizers: Dictionary<T>, synchronizer: Synchronizer<T, any>) => {
                return Object.assign(synchronizers, { [synchronizer.property]: synchronizer });
            }, {});
        }

        public get synchronizers(): Dictionary<T> {
            return this._synchronizers;
        }

        public setSynchronizer<PropKey extends keyof T, ParamsT = any>(stateProperty: PropKey, synchronizer: Synchronizer<T, PropKey, ParamsT>) {
            this._synchronizers[stateProperty] = synchronizer;
        }

        public getSynchronizer<PropKey extends keyof T, ParamsT = any>(stateProperty: PropKey): Synchronizer<T, PropKey, ParamsT> {
            const synchronizer = this._synchronizers[stateProperty] as Synchronizer<T, PropKey, ParamsT>;

            if (synchronizer) {
                return synchronizer;
            } else {
                throw new Error(`No Synchronizer defined for state property "${stateProperty}".`);
            }
        }
    }
}
