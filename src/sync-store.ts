import { Injectable } from "@angular/core";
import { Store } from "@ngxs/store";
import { SyncState } from "./decorators/sync-state";
import { StateSelector } from "./state-selector";
import { Synchronizers } from "./sychronizers";

@Injectable()
export class SyncStore extends Store {

    constructor(private synchronizers: Synchronizers, store: Store) {
        super(null, null, null);

        Object.assign(this, store);
    }

    public state<T>(syncState: SyncState.Class, ...parentStates: SyncState.Class[]): StateSelector<T> {
        return new StateSelector<T>(
            this,
            syncState,
            this.select(state => [...parentStates, syncState].reduce((newState, curState) => newState[curState.stateName], state)),
            this.synchronizers.getCollection<T>(syncState.stateName)
        );
    }
}
