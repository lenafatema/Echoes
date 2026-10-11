import type {ComponentType} from 'react';
import type {Scenario} from '../scenarios/schema';
import CollegeScene from './CollegeScene';import StartupScene from './StartupScene';import RestaurantScene from './RestaurantScene';import FloodScene from './FloodScene';import FilmScene from './FilmScene';import HarvestScene from './HarvestScene';
import type {SceneProps} from './types';
const art:Record<string,ComponentType<SceneProps>>={'college-tech-fest':CollegeScene,'startup-product-launch':StartupScene,'restaurant-opening-week':RestaurantScene,'flood-relief-camp':FloodScene,'film-shoot-weather':FilmScene,'harvest-before-rains':HarvestScene};
export function ScenarioIllustration(props:SceneProps){const View=art[props.scenario.id]||CollegeScene;return <View {...props}/>}
export {CollegeScene,StartupScene,RestaurantScene,FloodScene,FilmScene,HarvestScene};
