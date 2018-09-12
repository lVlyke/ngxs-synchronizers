import { Observable } from "rxjs";

export interface Synchronizer<PropertyT, ParamsT = any> {
    property: string;
    requiredProperties?: string[];
    proxy?: boolean;

    read(requiredDetails?: any, options?: Synchronizer.Options<ParamsT>): Observable<PropertyT>;
}

export namespace Synchronizer {

    export type Dictionary = {
        [stateProperty: string]: Synchronizer<any>;
    };

    export interface Options<ParamsT> {
        requestParams?: ParamsT;
        clearStore?: boolean;
    }

    export class Collection {
        protected _synchronizers: Dictionary = {};

        constructor(...args: Synchronizer<any>[]) {
            // Create the dictionary from the list of synchronizers
            this._synchronizers = args.reduce((synchronizers: Dictionary, Synchronizer:  Synchronizer<any>) => {
                return Object.assign(synchronizers, { [Synchronizer.property]: Synchronizer });
            }, {});
        }

        public get synchronizers(): Dictionary {
            return this._synchronizers;
        }

        public setSynchronizer<PropertyT, ParamsT = any>(stateProperty: string, Synchronizer: Synchronizer<PropertyT, ParamsT>) {
            this._synchronizers[stateProperty] = Synchronizer;
        }

        public getSynchronizer<PropertyT, ParamsT = any>(stateProperty: string): Synchronizer<PropertyT, ParamsT> {
            const Synchronizer = this._synchronizers[stateProperty];

            if (Synchronizer) {
                return Synchronizer;
            }
            else {
                throw new Error(`No Synchronizer defined for state property "${stateProperty}".`);
            }
        }
    }
}