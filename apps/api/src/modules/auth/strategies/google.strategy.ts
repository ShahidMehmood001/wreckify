import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

// Stateless state store — avoids requiring express-session for OAuth flow
class NoopStateStore {
  store(_req: any, _meta: any, cb: (err: any, state: string) => void) {
    cb(null, 'noop');
  }
  verify(_req: any, _state: any, cb: (err: any, ok: boolean) => void) {
    cb(null, true);
  }
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private config: ConfigService) {
    super({
      clientID: config.get<string>('google.clientId') || 'GOOGLE_CLIENT_ID_NOT_SET',
      clientSecret: config.get<string>('google.clientSecret') || 'GOOGLE_CLIENT_SECRET_NOT_SET',
      callbackURL: config.get<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
      store: new NoopStateStore(),
    } as any);
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
  ) {
    const { name, emails, photos } = profile;
    return {
      email: emails?.[0]?.value,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      avatarUrl: photos?.[0]?.value,
    };
  }
}
