import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { PAKISTAN_CARS } from '../constants/pakistan-cars.constant';

@ValidatorConstraint({ name: 'IsPakistanModel', async: false })
export class IsPakistanModelConstraint implements ValidatorConstraintInterface {
  validate(model: string, args: ValidationArguments): boolean {
    const make = (args.object as Record<string, unknown>).make as string | undefined;
    if (!make) return true; // make absent (partial update) — skip cross-field check
    const validModels = PAKISTAN_CARS[make];
    if (!validModels) return false;
    return validModels.includes(model);
  }

  defaultMessage(args: ValidationArguments): string {
    const make = (args.object as Record<string, unknown>).make as string | undefined;
    if (!make || !PAKISTAN_CARS[make]) return 'Invalid vehicle make';
    return `model must be one of: ${PAKISTAN_CARS[make].join(', ')}`;
  }
}

export function IsPakistanModel(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPakistanModelConstraint,
    });
  };
}
