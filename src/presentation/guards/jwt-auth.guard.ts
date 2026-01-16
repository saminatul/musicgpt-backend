import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Check if Authorization header exists
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization Bearer token is required');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization Bearer token is required');
    }

    // Call parent canActivate which will validate the token
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // If there's an error or info, it means token is invalid/expired
    if (err) {
      throw new UnauthorizedException('Invalid token');
    }

    if (info) {
      // Token expired, malformed, or invalid
      throw new UnauthorizedException('Invalid token');
    }

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user;
  }
}
