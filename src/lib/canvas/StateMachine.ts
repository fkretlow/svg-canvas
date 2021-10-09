export abstract class StateMachine<TStateKey=string, TTransitionData=any> {
    public transition(data: TTransitionData): void {
        if (!this.state)
            throw new Error(`StateMachine.transition: not in a defined state`);

        const key = this.state.transition(data);
        this.setState(key, data);
    }

    public registerState(state: IState<TStateKey, TTransitionData>) { this.states.set(state.key, state); }
    public unregisterState(key: TStateKey) { this.states.delete(key); }

    private state: IState<TStateKey, TTransitionData> | null = null;
    public setState(key: TStateKey, data?: TTransitionData) {
        if (key !== this.state?.key) {
            this.state.teardown?.(data);
            this.state = this.getState(key);
            this.state.initialize?.(data);
        }
    }

    private states = new Map<TStateKey, IState<TStateKey, TTransitionData>>();
    private getState(key: TStateKey): IState<TStateKey, TTransitionData> {
        const state = this.states.get(key);
        if (!state)
            throw new Error(`StateMachine.getState: no state found for key '${key}'`);
        return state;
    }

}


export interface IState<TStateKey, TTransitionData=any> {
    readonly key: TStateKey;
    transition(data: TTransitionData): TStateKey;
    initialize?: (data: TTransitionData) => void;
    teardown?: (data: TTransitionData) => void;
}
