import { Component, OnInit } from '@angular/core';
import { AppHeaderService } from '@app/services';
import { AlertController, ModalController, Platform, PopoverController, ToastController } from '@ionic/angular';
import { RouterLinks } from '@app/app/app.constant';
import { ActivatedRoute, Router } from '@angular/router';
import { EntityfilterComponent } from '../../shared/components/entityfilter/entityfilter.component';
import { LoaderService, LocalStorageService, ToastService, UtilsService } from '../../core';
import { urlConstants } from '../../core/constants/urlConstants';
import { AssessmentApiService } from '../../core/services/assessment-api.service';
import { StateModalComponent } from '../../shared/components/state-modal/state-modal.component';
import { DhitiApiService } from '../../core/services/dhiti-api.service';
import { TranslateService } from '@ngx-translate/core';
import { ObservationService } from '../observation.service';
import { storageKeys } from '../../storageKeys';

@Component({
  selector: 'app-observation-detail',
  templateUrl: './observation-detail.component.html',
  styleUrls: ['./observation-detail.component.scss'],
})
export class ObservationDetailComponent implements OnInit {
  headerConfig = {
    showHeader: true,
    showBurgerMenu: false,
    actionButtons: [],
  };
  observationId: any;
  solutionId: any;
  programId: any;
  submissionCount: any;
  solutionName: any;
  entityType: any;
  entities: any[];
  solutionData: any;
  submissionId: unknown;
  submissionIdArr: any;
  constructor(
    private headerService: AppHeaderService,
    private router: Router,
    private modalCtrl: ModalController,
    private routerParam: ActivatedRoute,
    private utils: UtilsService,
    private assessmentService: AssessmentApiService,
    private loader: LoaderService,
    private dhiti: DhitiApiService,
    private translate: TranslateService,
    private alertCntrl: AlertController,
    private toast: ToastService,
    private observationService: ObservationService,
    private localStorage: LocalStorageService
  ) {
    this.routerParam.queryParams.subscribe((params) => {
      this.observationId = params.observationId;
      this.solutionId = params.solutionId;
      this.programId = params.programId;
      this.solutionName = params.solutionName;
    });
  }

  ionViewWillEnter() {
    this.getObservationEntities();
    this.headerConfig = this.headerService.getDefaultPageConfig();
    this.headerConfig.actionButtons = [];
    this.headerConfig.showHeader = true;
    this.headerConfig.showBurgerMenu = false;
    this.headerService.updatePageConfig(this.headerConfig);
  }

  ngOnInit() {
    this.localStorage
      .getLocalStorage(storageKeys.observationSubmissionIdArr)
      .then((ids) => {
        this.submissionIdArr = ids;
      })
      .catch((error) => {
        this.submissionIdArr=[]
      });
  }

  async getObservationEntities() {
    let payload = await this.utils.getProfileInfo();
    let url = urlConstants.API_URLS.GET_OBSERVATION_ENTITIES;
    if (this.observationId) {
      url = `${url}/${this.observationId}`;
    }
    url = url + `?solutionId=${this.solutionId}`;
    if (payload) {
      const config = {
        url: url,
        payload: payload,
      };
      this.loader.startLoader();
      this.assessmentService.post(config).subscribe(
        (success) => {
          this.loader.stopLoader();
          if (success && success.result && success.result.entities) {
            this.solutionData = success.result;
            this.entities = success.result.entities;
            this.entityType = success.result.entityType;
            if (!this.observationId) {
              this.observationId = success.result._id; // for autotargeted if get observationId
            }
            //   this.checkForAnySubmissionsMade(); TODO:Implement
          } else {
            this.entities = [];
            if (!this.observationId) {
              this.observationId = success.result._id; // for autotargeted if get observationId
            }
          }
        },
        (error) => {
          this.entities = [];
          this.loader.stopLoader();
        }
      );
    }
  }

  async checkForAnySubmissionsMade() {
    let payload = await this.utils.getProfileInfo();
    payload.observationId = this.observationId;
    let url = urlConstants.API_URLS.GET_OBSERVATION_SUBMISSION_COUNT;
    const config = {
      url: url,
      payload: payload,
    };
    this.dhiti.post(config).subscribe(
      (success) => {
        this.submissionCount = success.data.noOfSubmissions;
      },
      (error) => {}
    );
  }

  goToObservationSubmission(entity) {
    // TODO : Changed logic to call 1st submission in the submission page only .
    this.router.navigate([`/${RouterLinks.OBSERVATION}/${RouterLinks.OBSERVATION_SUBMISSION}`], {
      queryParams: {
        programId: this.programId,
        solutionId: this.solutionId,
        observationId: this.observationId,
        entityId: entity._id,
        entityName: entity.name,
      },
    });
    // TODO:till here
  }

  async addEntity() {
    const type = this.entityType;
    let entityListModal;
    if (type == 'state') {
      entityListModal = await this.modalCtrl.create({
        component: StateModalComponent,
        componentProps: {
          data: this.observationId,
          solutionId: this.solutionId,
        },
      });
    } else {
      entityListModal = await this.modalCtrl.create({
        component: EntityfilterComponent,
        componentProps: {
          data: this.observationId,
          solutionId: this.solutionId,
        },
      });
    }
    await entityListModal.present();

    await entityListModal.onDidDismiss().then(async (entityList) => {
      if (entityList.data) {
        let payload = await this.utils.getProfileInfo();

        payload.data = [];
        entityList.data.forEach((element) => {
          //if coming from state list page
          if (type == 'state') {
            element.selected ? payload.data.push(element._id) : null;
            return;
          }

          payload.data.push(element._id); // if coming from EntityListPage
        });

        const config = {
          url: urlConstants.API_URLS.MAP_ENTITY_TO_OBSERVATION + `${this.observationId}`,
          payload: payload,
        };
        this.assessmentService.post(config).subscribe(
          (success) => {
            if (success) {
              this.getObservationEntities();
            }
          },
          (error) => {}
        );
      }
    });
  }
  async removeEntity(entity) {
    let entityId = entity._id;
    let translateObject;
    this.translate
      .get(['FRMELEMNTS_LBL_CONFIRM', 'FRMELEMNTS_LBL_DELETE_ENTITY', 'FRMELEMNTS_LBL_NO', 'FRMELEMNTS_LBL_YES'])
      .subscribe((translations) => {
        translateObject = translations;
      });
    let alert = await this.alertCntrl.create({
      header: translateObject['FRMELEMNTS_LBL_CONFIRM'],
      message: translateObject['FRMELEMNTS_LBL_DELETE_ENTITY'],
      buttons: [
        {
          text: translateObject['FRMELEMNTS_LBL_NO'],
          role: 'cancel',
          handler: () => {},
        },
        {
          text: translateObject['FRMELEMNTS_LBL_YES'],
          handler: () => {
            this.deleteEntity(entityId);
          },
        },
      ],
    });
    alert.present();
  }

  async deleteEntity(entityId) {
    this.loader.startLoader();
    let payload = await this.utils.getProfileInfo();
    payload.data = [entityId];

    const config = {
      url: urlConstants.API_URLS.UNMAP_ENTITY_TO_OBSERVATION + `${this.observationId}`,
      payload: payload,
    };
    this.assessmentService.post(config).subscribe(
      (success) => {
        let okMessage;
        this.translate.get('FRMELEMNTS_LBL_OK').subscribe((translations) => {
          okMessage = translations;
        });
        this.toast.openToast(success.message);

        this.loader.stopLoader();
        this.getObservationEntities();
      },
      (error) => {
        this.loader.stopLoader();
      }
    );
  }

  entityClickAction(e): void {
    if (this.solutionData.allowMultipleAssessemts) {
      this.goToObservationSubmission(e);
      return;
    }

    let presentLocally = this.submissionIdArr.find((id) => id == e.submissionId);

    if (e.submissionId && presentLocally) {
      this.goToEcm(e.submissionId, e.name);
      return;
    }

    if (!e.submissionId || !presentLocally) {
      let event = {
        entityId: e._id,
        observationId: this.solutionData._id,
        submission: {
          submissionNumber: 1,
        },
      };
      this.observationService
        .getAssessmentDetailsForObservation(event)
        .then((subId) => {
          this.submissionId = subId;
          return this.localStorage.getLocalStorage(storageKeys.observationSubmissionIdArr);
        })
        .then((ids) => {
          this.submissionIdArr = ids;
          let sId = ids.find((id) => id == this.submissionId);
          if (sId) {
            this.goToEcm(sId, e.name);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
  }

  goToEcm(submissionId, entityName) {
    this.router.navigate([RouterLinks.DOMAIN_ECM_LISTING], {
      queryParams: {
        submisssionId: submissionId,
        schoolName: entityName,
      },
    });
  }
}
