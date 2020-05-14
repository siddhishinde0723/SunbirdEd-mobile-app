import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RouterLinks } from '../app.constant';
import { CurriculumCoursesPage } from './curriculum-courses.page';

const routes: Routes = [
    {
        path: '',
        component: CurriculumCoursesPage
    },
    {
        path: RouterLinks.CURRICULUM_COURSE_DETAILS,
        loadChildren: './curriculum-course-details/curriculum-course-details.module#CurriculumCourseDetailsPageModule'
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    exports: [
        RouterModule
    ]
})
export class CurriculumCoursesRoutingModule { }
