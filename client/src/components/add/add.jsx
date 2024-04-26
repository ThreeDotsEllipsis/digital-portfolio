import m from './add.module.css';
import { useState } from 'react';
import axios from 'axios';

function Add() {

  const [type, setType] = useState('')
  const [name, setName] = useState('')
  const [descr, setDescr] = useState('')
  const [allDescr, setAllDescr] = useState('')
  const [link, setLink] = useState('')
  const [img, setImg] = useState(null)

  const onAdd = async () => {
    try {
      let formData = new FormData();
      console.log(img)
      formData.append('type', type)
      formData.append('title', name)
      formData.append('shortDescription', descr)
      formData.append('fullDescription', allDescr)
      formData.append('photo', img)

      const { data } = await axios.post('http://localhost:4000/api/portfolios/me/achievement', formData,
        {
          headers: { 'x-access-token': localStorage.getItem('token') },
        })
    }
    catch {
      console.log('Error add-achieve')
    }
  }

  return (
    <section className={m.add_achiv}>
      <p className={m.achiv_header_text}>Тип достижения</p>
      <select className={m.achiv_input_choose} value={type} onChange={(e) => { setType(e.target.value) }}>
        <option value=''></option>
        <option value='certificate'>Сертификат</option>
        <option value='project'>Проект</option>
      </select>

      <p className={m.achiv_header_text}>Название</p>
      <input className={`${m.achiv_input} ${m.achiv_input_name}`} value={name} onChange={(e) => { setName(e.target.value) }}></input>

      <p className={m.achiv_header_text}>Краткое описание</p>
      <textarea className={`${m.achiv_input} ${m.achiv_description}`} value={descr} onChange={(e) => { setDescr(e.target.value) }}></textarea>

      <p className={m.achiv_header_text}>Полное описание</p>
      <textarea className={`${m.achiv_input} ${m.achiv_full_description}`} value={allDescr} onChange={(e) => { setAllDescr(e.target.value) }}></textarea>

      <p className={m.achiv_header_text}>Ссылка на достижение</p>
      <input className={`${m.achiv_input} ${m.achiv_input_name}`}></input>

      <p className={m.achiv_header_text}>Участники</p>
      <input className={`${m.achiv_input} ${m.achiv_input_name}`}></input>

      <div className={m.centered_buttons}>
        <div className={`${m.button_sized} ${m.button_corrected}`}>
          <form className={m.add_photo}>
            <input className={m.add_photo_file} onChange={(e) => { setImg(e.target.files[0]) }} type='file' />
            <span>Добавить фото</span>
          </form>
        </div>
        <div className={m.button_sized}><a className={m.publish} href='/' onClick={() => { onAdd() }}>Опубликовать</a></div>
      </div>
    </section>
  );
}

export default Add;
