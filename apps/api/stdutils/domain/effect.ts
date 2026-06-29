import { Nominal } from '../nominal'

const createTag = Symbol()
export type Create<T> = Nominal<T, typeof createTag>
export const Create = <T>(v: T) => v as Create<T>

const updateTag = Symbol()
export type Update<T> = Nominal<T, typeof updateTag>
export const Update = <T>(v: T) => v as Update<T>

export type UpdateFn<Entity> = (lockedEntity: Entity) => Promise<Update<Entity>>

const deleteTag = Symbol()
export type Delete<T> = Nominal<T, typeof deleteTag>
export const Delete = <T>(v: T) => v as Delete<T>
