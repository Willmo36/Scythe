export type StateDefinition<Name extends string, Data extends Object> = {
    stateName: Name;
} & Data;

// export type StateTransition
