import { describe, expect, it } from 'vitest';
import { CATEGORIES, categoryOf } from './categories';

describe('CATEGORIES', () => {
  it('lists the legend in the order that the spec sets (AC-2.3)', () => {
    expect(CATEGORIES.map(({ label }) => label)).toEqual([
      'Energy Efficiency',
      'Solar',
      'Solar + Battery',
      'Battery',
    ]);
  });

  it('gives each category its marker and swatch color (AC-2.1)', () => {
    expect(
      Object.fromEntries(CATEGORIES.map(({ key, color }) => [key, color])),
    ).toEqual({
      energyEfficiency: '#00FFFF',
      solar: '#F5A623',
      solarBess: '#39FF14',
      bess: '#FF1493',
    });
  });
});

describe('categoryOf (AC-2.11)', () => {
  it.each([
    ['Energy Efficiency', 'energyEfficiency'],
    ['Solar', 'solar'],
    ['Solar + BESS', 'solarBess'],
    ['BESS', 'bess'],
    ['Solar + EV', 'solar'],
    // BlueIQ's names in its final file (D-44).
    ['Solar + Battery', 'solarBess'],
    ['battery', 'bess'],
  ])('maps Project Type %s to %s', (projectType, key) => {
    expect(categoryOf({ projectType })).toBe(key);
  });

  it('reads Project Type before Technologies', () => {
    expect(categoryOf({ projectType: 'BESS', technologies: ['Solar'] })).toBe(
      'bess',
    );
  });

  it('gives no category for a Project Type that names an object key', () => {
    expect(categoryOf({ projectType: 'constructor' })).toBeNull();
  });

  // BlueIQ's final file folds every other technology into Other (G4).
  it('treats an Other Project Type like a blank one', () => {
    expect(
      categoryOf({
        projectType: ' other ',
        technologies: ['Solar and EV Chargers'],
      }),
    ).toBe('solar');
    expect(categoryOf({ projectType: 'Other', technologies: [] })).toBeNull();
    expect(categoryOf({ projectType: 'Other' })).toBeNull();
  });

  it('never infers a category for an unrecognized Project Type', () => {
    expect(
      categoryOf({ projectType: 'Wind', technologies: ['Solar'] }),
    ).toBeNull();
  });

  describe('with a blank Project Type', () => {
    it.each([
      [['Solar']],
      [['solar']],
      [['Solar Canopy']],
      [['Solar and EV Chargers']],
      [['Solar', 'Lighting', 'HVAC']],
    ])('infers Solar from %j', (technologies) => {
      expect(categoryOf({ projectType: null, technologies })).toBe('solar');
    });

    it.each([
      [['Solar and Storage']],
      [['Solar and Storage ']],
      [['Solar', 'Battery Storage ']],
      [['Solar Canopy', 'BESS']],
    ])('infers Solar + BESS from %j', (technologies) => {
      expect(categoryOf({ projectType: '', technologies })).toBe('solarBess');
    });

    it.each([
      [['Battery Storage ']],
      [['VDER BESS']],
      [['BESS']],
    ])('infers BESS from %j', (technologies) => {
      expect(categoryOf({ technologies })).toBe('bess');
    });

    it.each([
      [['Lighting']],
      [['Controls', 'HVAC']],
      [['Building Envelope', 'Water', 'Piping']],
    ])('infers Energy Efficiency from %j', (technologies) => {
      expect(categoryOf({ projectType: '  ', technologies })).toBe(
        'energyEfficiency',
      );
    });

    it.each([
      [null],
      [[]],
      [[null]],
      [['EV Chargers']],
    ])('gives no category for %j', (technologies) => {
      expect(categoryOf({ technologies })).toBeNull();
    });
  });
});
