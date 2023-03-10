import React, {useState, useEffect} from 'react';
import {getDate} from '../../utils';
import {Form} from 'react-final-form';
import {useNavigate} from 'react-router-dom';
import {Prestamo, Dispositivo} from '../../../datatest/models';
import {firstValidations, secondValidations} from './createLoanValidations';
import {uploadLoan, selectLoanIsLoading, setIsLoading} from './createLoanFormSlice';

import {fetchActiveLoans, setSelectedLoanIsDisabled} from '../active-loans-list/activeLoansListSlice';

import {
  deserializeFunction,
  serializeFunction, 
  getDayName, 
  decodeToken
} from '../../utils';

import DeviceSelector from '../../devices/device-selector/DeviceSelector';
import {
  ClassroomSelector,
  CourseSelector,
  HoursSelector,
  NrcSelector,
  StudentSelector,
  TeacherSelector
} from '../../courses';

import {
  selectDevices, 
  selectSelectedDevices, 
  clearDevices
} from '../../devices/deviceSlice';

import {useAppSelector, useAppDispatch} from '../../../app/hooks';
import {Label, Button, Input, AlertDialog} from '../../@ui';

import styles from './CreateLoanForm.module.css';

// Formulario para crear un prestamo
export default function CreateLoanForm() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const devices = useAppSelector(selectDevices);
  const selectedDevices = useAppSelector(selectSelectedDevices);
  const isLoading = useAppSelector(selectLoanIsLoading);

  // Dialog variables
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isOptionEnabled, setIsOptionEnabled] = useState<boolean>(false);

  // Submit form
  const [form, setForm] = useState<any>();
  const [formData, setFormData] = useState<any>();

  // Send Flag
  const [send, setSend] = useState<boolean>(false);

  useEffect(() => {
    // Para enviar el préstamo es necesario que formData y form tengan datos, 
    // Y que la bandera send sea activada
    if (!!formData && !!form && send) {
      sendLoan();
    }
  }, [formData, form, send]);

  const sendLoan = () => {
    const closeSend = () => {
      setForm(null);
      setFormData(null);
      setSend(false);
    }

    const userData: any = decodeToken();

    // Si el usuario es null, significa que no hay token
    // ésto solo es por si acaso, en teoria nadie puede acceder al sistema sin un token.
    if (!userData) {
      localStorage.clear();
      navigate('/', { replace: true });
      return;
    }

    const {_id, nickname} = userData;
    const loan: Prestamo = {
      observaciones: formData.hasOwnProperty('observaciones') ? formData.observaciones: '',
      status: "activo",
      maestro: {
        _id: formData.maestros.value,
        nombre: formData.maestros.label,
      },
      materia: {
        _id: formData.materias.value,
        nombre: formData.materias.label,
        nrc: formData.nrcs.value,
        horario: {
          aula: formData.aulas.value,
          horaInicio: formData.horaInicio.value,
          horaFin: formData.horaFin.value,
          dia: getDayName(),
        }
      },
      dispositivos: selectedDevices.map((dispositivo: Dispositivo) => {
        return {
          _id: dispositivo._id,
          nombre: dispositivo.nombre,
          localPrestado: dispositivo.localPrestado,
        }
      }),
      usuario: {
        _id,
        nickname,
      },
      timelog: {
        inicio: new Date().toString(),
      },
      alumno: formData.hasOwnProperty('alumnos') ? formData.alumnos: null,
    }

    // Desactivar lista para que no interfiera con el envio
    dispatch(setSelectedLoanIsDisabled(true));
    // Enviar préstamo
    dispatch(uploadLoan(loan))
    .unwrap()
    .then((result) => {
      if (result.status === 200) {
        dispatch(setSelectedLoanIsDisabled(false));
        dispatch(fetchActiveLoans());

        clearAll();
        closeSend();
        dispatch(setIsLoading(false));
        return;
      }

      dispatch(setSelectedLoanIsDisabled(false));
      closeSend();
      openDialog('Mensaje', result.data.msg);
      dispatch(setIsLoading(false));
      return;
    })
    .catch((e) => {
      console.log(e);
      dispatch(setSelectedLoanIsDisabled(false));
      closeSend();
      openDialog('Error', 'Algo salió mal al intentar realizar un préstamo');
      dispatch(setIsLoading(false));
    });
  }

  const onSubmit = (data: any, form: any) => {
    // Validaciones de campos sencillas
    let validationsResult: any = firstValidations(data, selectedDevices);
    if (!validationsResult.isValid) {
      dispatch(setIsLoading(validationsResult.isValid));
      openDialog(validationsResult.dialog.title, validationsResult.dialog.description);
      return;
    }

    setFormData(data);
    setForm(form);

    // Validaciones complejas relacionadas con dispositivos
    validationsResult = secondValidations(data, selectedDevices, devices);
    if (!validationsResult.isValid) {
      dispatch(setIsLoading(validationsResult.isValid));

      // En caso de requerir la opcion de aceptar, se carga la opción con
      // sus variables y callback
      if (validationsResult.requireAcceptOption) {
        setIsOptionEnabled(true);
      }

      openDialog(validationsResult.dialog.title, validationsResult.dialog.description);
      return;
    }

    setSend(true);
  }

  const clearAll = () => {
    form.mutators.setValue('nrcs', '');
    form.mutators.setValue('maestros', '');
    form.mutators.setValue('materias', '');
    form.mutators.setValue('aulas', '');
    form.mutators.setValue('horaInicio', '');
    form.mutators.setValue('horaFin', '');
    form.mutators.setValue('alumnos', '');
    form.mutators.setValue('observaciones', '');
    dispatch(clearDevices());
  }

  // Abrir dialogo
  const openDialog = (title: string, descripcion: string) => {
    setTitle(title)
    setDescription(descripcion)
    setIsDialogOpen(true);
  }

  // Cerrar dialogo
  const handleClose = () => {
    setIsDialogOpen(false);
    if (isOptionEnabled) {
      setIsOptionEnabled(false);
    }
  }

  // Funcion del botón de aceptar para el dialogo
  const acceptHandler = () => {
    // Se cierra el dialogo actual
    handleClose();
    // Quitar la opcion del dialogo
    setIsOptionEnabled(false);
    // Abrir la bandera para enviar el préstamo
    setSend(true);
  }

  return (
    <>      
      <div className={styles.createLoan}>
        <Form
          onSubmit={onSubmit}
          mutators={{
            // expect (field, value) args from the mutator
            setValue: ([field, value], state, { changeValue }) => {
              changeValue(state, field, () => value)
            }
          }}
          render={({ handleSubmit, form: { mutators: { setValue } } }) => (
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Top pane */}
              <div className={styles.topPane}>

                {/* Fecha */}
                <div className={styles.formGroup}>
                  <Label className={styles.marginBottom} text="Fecha" size="16px" />
                  <Label className={styles.marginLeft} text={getDate(new Date())} size="20px" />
                </div>

                {/* Nrc */}
                <NrcSelector setValue={setValue} isLoading={isLoading} />

                {/* Maestro */}
                <TeacherSelector setValue={setValue} isLoading={isLoading} />

                {/* Materia */}
                <CourseSelector setValue={setValue} isLoading={isLoading} />

                {/* Aula */}
                <ClassroomSelector setValue={setValue} isLoading={isLoading} />

                {/* Horario */}
                <HoursSelector setValue={setValue} isLoading={isLoading} />
              </div>

              {/* Bottom pane */}
              <div className={styles.bottomPane}>
                {/* Selector de devices */}
                <DeviceSelector isLoading={isLoading} />
                
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '38.3% 38.3% 1fr',
                    gridGap: '1.6%',
                  }} >
                  {/* Estudiantes */}
                  <StudentSelector setValue={setValue} isLoading={isLoading} />

                  {/* Input de observaciones */}
                  <div 
                    style={{
                      display: "flex",
                      flexFlow: "column",
                      alignItems: "stretch",
                    }}>
                    <Input 
                      isLoading={isLoading}
                      name="observaciones"
                      placeholder="Observaciones" 
                      autocomplete="off" />
                  </div>

                  {/* Botón de prestar */}
                  <div className={styles.btnContainer}>
                    <Button 
                      type="submit"
                      text="Prestar" 
                      style={{flexGrow: 1}}
                      disabled={isLoading} />
                  </div>
                </div>
              </div>
            </form>
          )}
        />
      </div>
      <AlertDialog
        isOpen={isDialogOpen}
        title={title}
        description={description}
        handleClose={handleClose} 
        isOptionEnabled={isOptionEnabled}
        acceptHandler={acceptHandler} />
    </>
  );
}
