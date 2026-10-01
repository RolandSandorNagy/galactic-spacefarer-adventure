import cds from '@sap/cds';
import GalacticService from './galactic-service.js';

const IMMUTABLE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'originPlanet',
  'originPlanet_code',
  'position',
  'position_code',
  'wormholeNavigationSkill'
];

export default class GalacticFioriService extends GalacticService {
  init() {
    const { SpaceFarers } = this.entities;

    this.before('UPDATE', SpaceFarers, discardImmutableInput);

    this.before('PATCH', SpaceFarers.drafts, async req => {
      const draft = await cds.tx(req).run(
        cds.ql.SELECT.one.from(req.subject).columns('HasActiveEntity')
      );

      // Never accept a client-supplied draft state as proof of a new record.
      delete req.data.HasActiveEntity;
      if (draft?.HasActiveEntity) {
        discardImmutableInput(req);
      }
    });

    return super.init();
  }
}

function discardImmutableInput(req) {
  for (const field of IMMUTABLE_FIELDS) {
    delete req.data[field];
  }
}
