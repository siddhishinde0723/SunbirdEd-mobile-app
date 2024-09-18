import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { DistrictMapping1Page } from './district-mapping1.page';
import { TranslateModule } from '@ngx-translate/core';
import { PipesModule } from '@app/pipes/pipes.module';
import { CommonFormElementsModule } from 'common-form-elements';
import { LocationHandler } from '@app/services/location-handler';
import {ProfileHandler} from '@app/services/profile-handler';
const routes: Routes = [
  {
    path: '',
    component: DistrictMapping1Page
  }
];

@NgModule({
  imports: [
    CommonModule,
    
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    TranslateModule.forChild(),
    PipesModule,
    CommonFormElementsModule,
    ReactiveFormsModule

  ],
  declarations: [DistrictMapping1Page],
  providers: [LocationHandler, ProfileHandler]
})
export class DistrictMapping1PageModule {}
