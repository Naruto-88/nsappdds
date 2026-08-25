import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { RosterService } from './roster.service';
import { AnalyticsService } from '../google-api/analytics.service';

@Controller(['api/roster', 'home/api/roster'])
@UseGuards(SessionAuthGuard)
export class RosterController {
  constructor(
    private readonly roster: RosterService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get()
  getRoster() {
    return this.roster.getDiscoveredRoster();
  }

  // Lets a domain be checked against GA4 before it's in the _CONFIG sheet at all —
  // findPropertyIdForDomain() only needs a domain string, not a GSC-registered
  // property, so this is useful standalone for spot-checking a client before
  // committing anything to the sheet.
  @Get('ga4-lookup')
  async ga4Lookup(@Query('domain') domain: string) {
    const propertyId = await this.analytics.findPropertyIdForDomain(domain);
    return { domain, propertyId };
  }
}
