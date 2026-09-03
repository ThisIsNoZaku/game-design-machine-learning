import { ActionDefinition } from "../../definitions/ActionDefinition";
import { GameDefinition } from "../../definitions/BaseGameDefinition";
import { GameState } from "../../state/GameState";
import { RegionInstance } from "../../state/RegionInstance";
import { ThingState } from "../../state/ThingState";

type SelectionResultMap = {
    entities: ThingState;
    regions: RegionInstance;
    actions: ActionDefinition;
};

export type SelectionType = keyof SelectionResultMap;
export type SelectionResult<TSelectionType extends SelectionType> = SelectionResultMap[TSelectionType];

export type SelectionPredicate<T> = (item: T, index: number) => boolean;

export class FluentSelection<T> implements Iterable<T> {
    private readonly sourceFactory: () => Iterable<T>;
    private readonly predicates: SelectionPredicate<T>[];

    constructor(
        sourceFactory: () => Iterable<T>,
        predicates: SelectionPredicate<T>[] = []
    ) {
        this.sourceFactory = sourceFactory;
        this.predicates = predicates;
    }

    where(predicate: SelectionPredicate<T>): FluentSelection<T> {
        return new FluentSelection<T>(this.sourceFactory, [...this.predicates, predicate]);
    }

    whereId(ids: string | number | Array<string | number>): FluentSelection<T> {
        const candidates = this.toStringSet(ids);
        return this.where((item) => this.matchesScalarProperty(item, "id", candidates));
    }

    whereName(names: string | string[]): FluentSelection<T> {
        const candidates = this.toStringSet(names);
        return this.where((item) => this.matchesScalarProperty(item, "name", candidates));
    }

    hasTag(tags: string | string[]): FluentSelection<T> {
        const requestedTags = this.toStringSet(tags);
        return this.where((item) => this.matchesTagsProperty(item, requestedTags));
    }

    toGenerator(): Generator<T> {
        const source = this.sourceFactory;
        const predicates = this.predicates;
        return (function* generateMatches(): Generator<T> {
            let index = 0;
            for (const item of source()) {
                const matches = predicates.every((predicate) => predicate(item, index));
                if (matches) {
                    yield item;
                }
                index += 1;
            }
        })();
    }

    [Symbol.iterator](): Generator<T> {
        return this.toGenerator();
    }

    toArray(): T[] {
        return Array.from(this.toGenerator());
    }

    private toStringSet(values: string | number | Array<string | number>): Set<string> {
        const valuesArray = Array.isArray(values) ? values : [values];
        return new Set(valuesArray.map((value) => String(value)));
    }

    private matchesScalarProperty(item: T, propertyName: "id" | "name", candidates: Set<string>): boolean {
        const property = this.getProperty(item, propertyName);
        if (typeof property !== "string" && typeof property !== "number") {
            return false;
        }

        return candidates.has(String(property));
    }

    private matchesTagsProperty(item: T, requestedTags: Set<string>): boolean {
        const property = this.getProperty(item, "tags");
        const candidateTags = this.normalizeTags(property);
        return candidateTags.some((candidateTag) => requestedTags.has(candidateTag));
    }

    private normalizeTags(property: unknown): string[] {
        if (typeof property === "string") {
            return [property];
        }

        if (Array.isArray(property)) {
            return property
                .filter((entry): entry is string | number => typeof entry === "string" || typeof entry === "number")
                .map((entry) => String(entry));
        }

        if (property instanceof Set) {
            return Array.from(property)
                .filter((entry): entry is string | number => typeof entry === "string" || typeof entry === "number")
                .map((entry) => String(entry));
        }

        return [];
    }

    private getProperty(item: T, key: string): unknown {
        if (typeof item !== "object" || item === null) {
            return undefined;
        }
        return (item as Record<string, unknown>)[key];
    }
}

export class GameSelection {
    private readonly state: GameState;
    private readonly definition: GameDefinition;

    constructor(state: GameState, definition: GameDefinition) {
        this.state = state;
        this.definition = definition;
    }

    fromEntities(): FluentSelection<ThingState> {
        return new FluentSelection(() => Object.values(this.state.entities));
    }

    fromRegions(): FluentSelection<RegionInstance> {
        return new FluentSelection(() => Object.values(this.state.regions));
    }

    fromActions(): FluentSelection<ActionDefinition> {
        return new FluentSelection(() => this.definition.actions);
    }
}

export class SelectionBuilder {
    in(state: GameState, definition: GameDefinition): GameSelection {
        return new GameSelection(state, definition);
    }
}

export function select(): SelectionBuilder {
    return new SelectionBuilder();
}
