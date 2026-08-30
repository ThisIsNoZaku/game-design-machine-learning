import Selector from "../Selector";
import { AgentDefinition } from "./AgentDefinition";
import {EntityDefinition} from "./EntityDefinition";
import {RegionDefinition} from "./RegionDefinition";

/**
 * A rule that describes an instruction or constraint in the game.
 *
 * Rules are applied to modify or constraint state.
 *
 * Rules have the following properties:
 * - id: A unique identifier for the rule.
 * - targets: A definition of the elements that the rule applies to.
 * - conditions: A list of expressions that must be true for the rule to be applied.
 *
 * Rules can be of one of two type:
 * 1. Triggered: A rule that is applied when an event occurs.
 * 2. Constraint: A rule that limits or determines something.
 *
 * For example, the chess rule for movement of a piece is a Constraint rule, as it limits the possible locations that a
 * movement decision can select from.
 *
 * Alternatively, the chess rule for pawn promotion is a Triggered rule, as it is applied when a pawn is placed in a particular location.
 */
export class Rule {
    id: string;
    type: RuleType;
    description?: string;
    targets: {"entity"? : EntityRuleTarget[], "location"?: LocationRuleTarget[], "agent"?: AgentRuleTarget[]};
    constructor(id: string, type: RuleType, targets: {"entity"? : EntityRuleTarget[], "location"?: LocationRuleTarget[], "agent"?: AgentRuleTarget[]}, description?: string) {
        this.id = id;
        this.type = type;
        this.targets = targets;
    }
}

export type RuleType = "triggered" | "constraint";

export abstract class RuleTarget<T> {
    type: string;
    filter: Selector<T>;
    constructor(type: string, filter: Selector<T>) {
        this.type = type;
        this.filter = filter;
    }
}

export class EntityRuleTarget extends RuleTarget<EntityDefinition> {
    constructor(type: string, filter: Selector<EntityDefinition>) {
        super(type, filter);
    }
}

export class LocationRuleTarget extends RuleTarget<RegionDefinition> {
    constructor(type: string, filter: Selector<RegionDefinition>) {
        super(type, filter);
    }
}
export class AgentRuleTarget extends RuleTarget<AgentDefinition> {
    constructor(type: string, filter: Selector<AgentDefinition>) {
        super(type, filter);
    }
}