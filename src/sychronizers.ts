import { Injector } from "@angular/core";
import { Synchronizer } from "./synchronizer";

export class Synchronizers {

    public readonly collections: Synchronizers.Dictionary = {};

    constructor(injector: Injector, collectionBuilder: Synchronizers.BuilderDictionary) {
        for (const stateName in collectionBuilder) {
            const synchronizers = collectionBuilder[stateName];

            // Inject each Synchronizer dependency into the collection
            this.collections[stateName] = new Synchronizer.Collection<any>(...synchronizers.map(dep => injector.get(dep)));
        }
    }

    public setCollection<T>(stateName: string, collection: Synchronizer.Collection<T>) {
        this.collections[stateName] = collection;
    }

    public getCollection<T>(stateName: string): Synchronizer.Collection<T> {
        const collection = this.collections[stateName] as Synchronizer.Collection<T>;

        if (collection) {
            return collection;
        } else {
            throw new Error(`No synchronizer collection defined for state name "${stateName}".`);
        }
    }
}

export namespace Synchronizers {

    export type Dictionary = {
        [stateName: string]: Synchronizer.Collection<any>
    };

    export type BuilderDictionary = {
        [stateName: string]: { new(...args: any[]): Synchronizer<any, any> }[]
    };
}
