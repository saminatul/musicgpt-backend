import { IsEmail, IsString, MinLength, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

@ValidatorConstraint({ name: 'passwordComplexity', async: false })
export class PasswordComplexityConstraint implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    if (!password) return false;
    // At least 8 characters
    if (password.length < 8) return false;
    // At least 1 number
    if (!/\d/.test(password)) return false;
    // At least 1 uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    // At least 1 lowercase letter
    if (!/[a-z]/.test(password)) return false;
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Password must be at least 8 characters long and contain at least 1 number, 1 uppercase letter, and 1 lowercase letter';
  }
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'Password123', 
    description: 'Password must be at least 8 characters with 1 number, 1 uppercase, and 1 lowercase letter',
    minLength: 8 
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Validate(PasswordComplexityConstraint)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  displayName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token for API authentication' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token for obtaining new access tokens' })
  refreshToken: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    email: string;
    displayName: string;
    subscriptionStatus: string;
  };
}

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'JWT access token for API authentication' })
  accessToken: string;

  @ApiProperty({ description: 'New refresh token for obtaining new access tokens' })
  refreshToken: string;

  @ApiProperty({ description: 'Username (displayName) associated with the refresh token' })
  username: string;
}