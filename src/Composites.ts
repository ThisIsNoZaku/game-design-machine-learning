import {Expression} from "./rules/Expression";

export type Any ={
    "any": Array<Expression>
}

export type All = {
    "all": Array<Expression>
}