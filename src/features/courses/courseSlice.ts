import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { RootState } from '../../app/store';

import {Alumno, Maestro, Materia, Asignacion} from '../../datatest/models';
import {aulas, maestros, alumnos, materias} from '../../datatest/data'
import {getDayName} from '../utils';

/*
  Nota: Agregar sockets para refrescar las listas en caso de cambios en el backend
*/

///////////////////////////
// State
///////////////////////////
const initialState: CourseState = {
  classrooms: [],
  courses: [],
  nrcs: [],
  students: [],
  teachers: [],
};

///////////////////////////
// Async functions
///////////////////////////

// Function to get all classrooms
export const fetchClassrooms = createAsyncThunk('courses/fetchClassrooms', async () => {
  return aulas.map((aula: string) => ({
    label: aula,
    value: aula,
  }));
});

// Function to get all courses
export const fetchCourses = createAsyncThunk('courses/fetchCourseNames', async () => {
  return materias.map((materia: Materia) => {
    return {
      ...materia,
      label: materia.nombre,
      value: materia._id,
    }
  });
});

// Function to get all nrc
export const fetchNrcs = createAsyncThunk('courses/fetchNrcs', async () => {
  const nrcs: any[] = materias.map((materia: Materia) => {
    return materia.asignaciones.map((asignacion: Asignacion) => {
      return {
        ...asignacion,
        materia: {
          _id: materia._id,
          nombre: materia.nombre,
        },
        label: asignacion.nrc,
        value: asignacion.nrc,
      }
    });
  });

  const data: NrcTag[] = [].concat(...nrcs);
  // Filtrando los nrcs que dan clase el dia de hoy
  const dailyData: any = data.map((nrc) => {
    const dayName = getDayName();
    for (let horario of nrc.horarios) {
      if (horario.dia === dayName) {
        return nrc;
      }
    }

    return;
  }).filter((nrc) => nrc !== undefined);

  return dailyData;
});

// Function to get all students
export const fetchStudents = createAsyncThunk('courses/fetchStudents', async () => {
  return alumnos.map((alumno: Alumno) => {
    return {
      ...alumno,
      label: alumno.nombre,
      value: alumno.matricula,
    }
  });
});

// Function to get all teachers
export const fetchTeachers = createAsyncThunk('courses/fetchTeachers', async () => {
  return maestros.map((maestro: Maestro) => {
    return {
      ...maestro,
      label: maestro.nombre,
      value: maestro._id,
    }
  });
});

///////////////////////////
// Slice
///////////////////////////
export const courseSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClassrooms.fulfilled, (state, action) => {
        state.classrooms = action.payload;
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.courses = action.payload;
      })
      .addCase(fetchNrcs.fulfilled, (state, action) => {
        state.nrcs = action.payload;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.students = action.payload;
      })
      .addCase(fetchTeachers.fulfilled, (state, action) => {
        state.teachers = action.payload;
      });
  },
});

export default courseSlice.reducer;

///////////////////////////
// Selector
///////////////////////////
export const selectClassrooms = (state: RootState) => state.courses.classrooms;
export const selectCourses = (state: RootState) => state.courses.courses;
export const selectNrcs = (state: RootState) => state.courses.nrcs;
export const selectStudents = (state: RootState) => state.courses.students;
export const selectTeachers = (state: RootState) => state.courses.teachers;

///////////////////////////
// Interfaces
///////////////////////////
interface Tag {
  label: string;
  value: string;
}

interface NrcMeta {
  readonly _id: string;
  readonly nombre: string;
}

type StudentTag = Tag & Alumno;
type TeacherTag = Tag & Maestro;
type CourseTag = Tag & Materia;
type NrcTag = Tag & Asignacion & NrcMeta;

export interface CourseState {
  classrooms: Tag[];
  courses: CourseTag[];
  nrcs: NrcTag[];
  students: StudentTag[];
  teachers: TeacherTag[];
};