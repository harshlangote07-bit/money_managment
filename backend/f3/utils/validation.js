import { ObjectId } from "mongodb";

export function validateObjectId(value, fieldName = "ID") {
if (
typeof value !== "string" ||
!ObjectId.isValid(value) ||
!/^[a-fA-F0-9]{24}$/.test(value)
) {
throw new Error(`${fieldName} must be a valid MongoDB ObjectId.`);
}

return new ObjectId(value);
}

export function validateRequiredString(
value,
fieldName,
maxLength = 200
) {
if (typeof value !== "string" || !value.trim()) {
throw new Error(`${fieldName} is required.`);
}

const result = value.trim();

if (result.length > maxLength) {
throw new Error(
`${fieldName} cannot exceed ${maxLength} characters.`
);
}

return result;
}

export function validateNumber(
value,
fieldName,
{
min = 0,
max = Number.MAX_SAFE_INTEGER,
required = true
} = {}
) {
if (
value === undefined ||
value === null ||
value === ""
) {
if (!required) {
return null;
}

throw new Error(`${fieldName} is required.`);


}

if (
typeof value !== "number" &&
typeof value !== "string"
) {
throw new Error(`${fieldName} must be a number.`);
}

if (typeof value === "string" && !value.trim()) {
throw new Error(`${fieldName} must be a number.`);
}

const number = Number(value);

if (!Number.isFinite(number)) {
throw new Error(`${fieldName} must be a valid number.`);
}

if (number < min) {
throw new Error(`${fieldName} must be at least ${min}.`);
}

if (number > max) {
throw new Error(`${fieldName} cannot exceed ${max}.`);
}

return number;
}

export function validateDate(value, fieldName = "date") {
if (!value) {
throw new Error(`${fieldName} is required.`);
}

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
throw new Error(`${fieldName} must be a valid date.`);
}

return date;
}

export function validateEnum(
value,
allowedValues,
fieldName
) {
if (
typeof value !== "string" ||
!allowedValues.includes(value)
) {
throw new Error(
`${fieldName} must be one of: ${allowedValues.join(", ")}.`
);
}

return value;
}

export function validateArray(
value,
fieldName,
{ minLength = 1, maxLength = 1000 } = {}
) {
if (!Array.isArray(value)) {
throw new Error(`${fieldName} must be an array.`);
}

if (value.length < minLength) {
throw new Error(
`${fieldName} must contain at least ${minLength} item(s).`
);
}

if (value.length > maxLength) {
throw new Error(
`${fieldName} cannot contain more than ${maxLength} item(s).`
);
}

return value;
}

export function validateCurrency(value = "INR") {
if (typeof value !== "string") {
throw new Error("currency must be a string.");
}

const currency = value.trim().toUpperCase();

if (!/^[A-Z]{3}$/.test(currency)) {
throw new Error(
"currency must be a three-letter currency code, such as INR."
);
}

return currency;
}

export function validateTransactionType(value) {
return validateEnum(
value,
["income", "expense"],
"transaction type"
);
}

export function validatePriority(value = "medium") {
return validateEnum(
value,
["low", "medium", "high"],
"priority"
);
}
