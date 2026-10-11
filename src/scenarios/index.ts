import college from './college-tech-fest.ts';
import startup from './startup-product-launch.ts';
import restaurant from './restaurant-opening-week.ts';
import flood from './flood-relief-camp.ts';
import film from './film-shoot-weather.ts';
import harvest from './harvest-before-rains.ts';
export const scenarios = [college,startup,restaurant,flood,film,harvest];
export const scenarioById = Object.fromEntries(scenarios.map(s=>[s.id,s]));
