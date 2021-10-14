export class StateMachine<TContext> {
    constructor(context: TContext, initialState: State) {
        this.state = initialState;
        this.context = context;
    }
    private state: State;
    private context: TContext;

    public send(event: IEvent) {
        const newState = this.state.transition(event);
        if (!Object.is(newState, this.state)) {
            this.state.onExit(event);
            newState.setContext(this.context);
            newState.onEnter(event);
            this.state = newState;
        }
    }
}


export abstract class State {
    abstract transition(event: IEvent): State;
    onEnter(event: IEvent): void {}
    onExit(event: IEvent): void {}

    protected context: any;
    setContext(context: any): void {
        this.context = context;
    }
}
