import { Nominal } from '../stdutils/nominal'
import { monotonicFactory } from 'ulid'

const ulid = monotonicFactory()
export const generateId = () => ulid()

// User

const userIdTag = Symbol()
export type UserId = Nominal<string, typeof userIdTag>
export const UserId = (v: string) => v as UserId
export const NewUserId = () => UserId(generateId())

// Administrator

const administratorIdTag = Symbol()
export type AdministratorId = Nominal<string, typeof administratorIdTag>
export const AdministratorId = (v: string) => v as AdministratorId
export const NewAdministratorId = () => AdministratorId(generateId())

// Image

const imageIdTag = Symbol()
export type ImageId = Nominal<string, typeof imageIdTag>
export const ImageId = (v: string) => v as ImageId
export const NewImageId = () => ImageId(generateId())

const imageTagIdTag = Symbol()
export type ImageTagId = Nominal<string, typeof imageTagIdTag>
export const ImageTagId = (v: string) => v as ImageTagId
export const NewImageTagId = () => ImageTagId(generateId())
