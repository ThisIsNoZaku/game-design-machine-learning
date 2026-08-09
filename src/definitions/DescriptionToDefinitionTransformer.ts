/**
 * Interface which transforms a possibly-partial Description into a fully defined Definition.
 */
export interface DescriptionToDefinitionTransformer<In, Out> {
    transform(input:In):Out
}