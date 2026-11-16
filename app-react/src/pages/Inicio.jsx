
import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';

const ESTADOS_ACTIVOS = ['ABIERTO', 'EN_PROCESO', 'BLOQUEADO'];

const ORDEN_CRITICIDAD = {
    'CRI-ALTA': 1,
    'CRI-MEDIA': 2,
    'CRI-BAJA': 3,
};

function Inicio() {
    const [tickets, setTickets] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [catalogos, setCatalogos] = useState({
        sistemas: [],
        subsistemas: [],
        criticidades: [],
        tiposProblema: [],
    });

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [accionError, setAccionError] = useState('');
    const [tomandoId, setTomandoId] = useState(null);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    const [nuevoBorrador, setNuevoBorrador] = useState({
        titulo: '',
        descripcion: '',
        localidadId: '',
        sistema: '',
        subsistema: '',
        criticidad: '',
        tipoProblema: '',
    });

    const usuarioActual = JSON.parse(sessionStorage.getItem('usuario'));

    useEffect(() => {
        async function cargarDatos() {
            try {
                setCargando(true);
                setError('');

                const [listaTickets, listaLocalidades, listaCatalogos] =
                    await Promise.all([
                        apiRequest('/api/tickets'),
                        apiRequest('/api/localidades'),
                        apiRequest('/api/catalogos'),
                    ]);

                setTickets(listaTickets);
                setLocalidades(listaLocalidades);
                setCatalogos(listaCatalogos);
            } catch (err) {
                setError(err.message);
            } finally {
                setCargando(false);
            }
        }

        cargarDatos();
    }, []);

    async function tomarTicket(ticket) {
        try {
            setTomandoId(ticket.id);
            setAccionError('');

            const usuario = JSON.parse(sessionStorage.getItem('usuario'));

            if (!usuario?.usuario) {
                throw new Error('No se pudo identificar al usuario conectado.');
            }

            await apiRequest(`/api/tickets/${ticket.id}/asignar`, {
                method: 'POST',
                body: JSON.stringify({
                    operador: usuario.usuario,
                }),
            });

            const listaActualizada = await apiRequest('/api/tickets');
            setTickets(listaActualizada);
        } catch (err) {
            setAccionError(err.message);
        } finally {
            setTomandoId(null);
        }
    }

    function nombreLocalidad(id) {
        const localidad = localidades.find((l) => l.id === id);
        return localidad?.nombre || 'Sin localidad';
    }

    function actualizarBorrador(campo, valor) {
        setNuevoBorrador((actual) => ({
            ...actual,
            [campo]: valor,
            ...(campo === 'sistema' ? { subsistema: '' } : {}),
        }));
    }

    async function guardarBorrador(e) {
        e.preventDefault();

        try {
            setAccionError('');

            const datos = {
                ...nuevoBorrador,
                localidadId: nuevoBorrador.localidadId
                    ? Number(nuevoBorrador.localidadId)
                    : null,
                adjuntos: [],
                borradorId: null,
                registroDirecto: false,
                privado: false,
                solucionTexto: null,
                solucionCatalogoId: null,
                solucionAdjuntos: [],
            };

            await apiRequest('/api/tickets/borradores', {
                method: 'POST',
                body: JSON.stringify(datos),
            });

            const listaActualizada = await apiRequest('/api/tickets');
            setTickets(listaActualizada);

            setNuevoBorrador({
                titulo: '',
                descripcion: '',
                localidadId: '',
                sistema: '',
                subsistema: '',
                criticidad: '',
                tipoProblema: '',
            });

            setMostrarFormulario(false);
        } catch (err) {
            setAccionError(err.message);
        }
    }

    const subsistemasDisponibles = catalogos.subsistemas.filter(
        (sub) =>
            sub.sistema === nuevoBorrador.sistema &&
            sub.activo
    );

    const pendientes = tickets
        .filter(
            (ticket) =>
                ESTADOS_ACTIVOS.includes(ticket.estado) &&
                !ticket.operador
        )
        .sort((a, b) => {
            const prioridadA =
                ORDEN_CRITICIDAD[a.criticidad?.toUpperCase()] || 9;
            const prioridadB =
                ORDEN_CRITICIDAD[b.criticidad?.toUpperCase()] || 9;

            return prioridadA - prioridadB ||
                new Date(a.creadoEn) - new Date(b.creadoEn);
        });

    const misTickets = tickets.filter(
        (ticket) =>
            ticket.operador === usuarioActual?.usuario &&
            ['EN_PROCESO', 'BLOQUEADO'].includes(ticket.estado)
    );

    const borradores = tickets.filter(
        (ticket) => ticket.estado === 'BORRADOR'
    );

    if (cargando) {
        return (
            <main className="main">
                <div className="contenedor">
                    <p>Cargando tickets...</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="main">
                <div className="contenedor">
                    <div className="aviso rojo">{error}</div>
                </div>
            </main>
        );
    }

    return (
        <main className="main">
            <div className="contenedor pila-lg">

                <div className="cabecera">
                    <div className="titulos">
                        <h1>Inicio</h1>
                    </div>
                </div>

                {accionError && (
                    <div className="aviso rojo">
                        {accionError}
                    </div>
                )}

                {/* Tickets pendientes */}
                <section className="card">
                    <div className="card-titulo">
                        <h2>Tickets pendientes ({pendientes.length})</h2>
                    </div>

                    {pendientes.length === 0 ? (
                        <div className="vacio">
                            <p>No hay tickets pendientes.</p>
                        </div>
                    ) : (
                        <div className="tabla-envoltura">
                            <table className="tabla responsive">
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Ticket</th>
                                        <th>Localidad</th>
                                        <th>Criticidad</th>
                                        <th>Estado</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {pendientes.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td className="num">
                                                #{ticket.numero ?? ticket.id}
                                            </td>
                                            <td className="titulo-celda">
                                                {ticket.titulo}
                                            </td>
                                            <td>
                                                {nombreLocalidad(ticket.localidadId)}
                                            </td>
                                            <td>
                                                {ticket.criticidad || 'Sin definir'}
                                            </td>
                                            <td>
                                                <span className={`badge estado-${ticket.estado}`}>
                                                    {ticket.estado}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-primario btn-sm"
                                                    type="button"
                                                    onClick={() => tomarTicket(ticket)}
                                                    disabled={tomandoId !== null}
                                                >
                                                    {tomandoId === ticket.id
                                                        ? 'Tomando...'
                                                        : 'Tomar'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Mis tickets */}
                <section className="card">
                    <div className="card-titulo">
                        <h2>Mis tickets ({misTickets.length})</h2>
                    </div>

                    {misTickets.length === 0 ? (
                        <div className="vacio">
                            <p>No tenés tickets asignados.</p>
                        </div>
                    ) : (
                        <div className="tabla-envoltura">
                            <table className="tabla responsive">
                                <thead>
                                    <tr>
                                        <th>Número</th>
                                        <th>Ticket</th>
                                        <th>Localidad</th>
                                        <th>Criticidad</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {misTickets.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td className="num">
                                                #{ticket.numero ?? ticket.id}
                                            </td>
                                            <td className="titulo-celda">
                                                {ticket.titulo}
                                            </td>
                                            <td>
                                                {nombreLocalidad(ticket.localidadId)}
                                            </td>
                                            <td>
                                                {ticket.criticidad || 'Sin definir'}
                                            </td>
                                            <td>
                                                <span className={`badge estado-${ticket.estado}`}>
                                                    {ticket.estado}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Mis borradores */}
                <section className="card">
                    <div className="card-titulo">
                        <h2>Mis borradores ({borradores.length})</h2>

                        <button
                            className="btn btn-primario"
                            type="button"
                            onClick={() => setMostrarFormulario(!mostrarFormulario)}
                        >
                            {mostrarFormulario ? 'Cancelar' : '+ Nuevo borrador'}
                        </button>
                    </div>

                    {mostrarFormulario && (
                        <div className="card compacta">
                            <form onSubmit={guardarBorrador} className="pila">
                                <h3>Nuevo borrador</h3>

                                <div className="grid-2">
                                    <div className="campo">
                                        <label htmlFor="titulo">Título</label>
                                        <input
                                            className="control"
                                            id="titulo"
                                            type="text"
                                            value={nuevoBorrador.titulo}
                                            onChange={(e) =>
                                                actualizarBorrador('titulo', e.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="campo">
                                        <label htmlFor="localidad">Localidad</label>
                                        <select
                                            className="control"
                                            id="localidad"
                                            value={nuevoBorrador.localidadId}
                                            onChange={(e) =>
                                                actualizarBorrador('localidadId', e.target.value)
                                            }
                                        >
                                            <option value="">Seleccionar localidad</option>
                                            {localidades.map((localidad) => (
                                                <option
                                                    key={localidad.id}
                                                    value={localidad.id}
                                                >
                                                    {localidad.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="campo">
                                        <label htmlFor="sistema">Sistema</label>
                                        <select
                                            className="control"
                                            id="sistema"
                                            value={nuevoBorrador.sistema}
                                            onChange={(e) =>
                                                actualizarBorrador('sistema', e.target.value)
                                            }
                                        >
                                            <option value="">Seleccionar sistema</option>
                                            {catalogos.sistemas
                                                .filter((s) => s.activo)
                                                .map((sistema) => (
                                                    <option
                                                        key={sistema.codigo}
                                                        value={sistema.codigo}
                                                    >
                                                        {sistema.nombre}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="campo">
                                        <label htmlFor="subsistema">Subsistema</label>
                                        <select
                                            className="control"
                                            id="subsistema"
                                            value={nuevoBorrador.subsistema}
                                            onChange={(e) =>
                                                actualizarBorrador('subsistema', e.target.value)
                                            }
                                            disabled={!nuevoBorrador.sistema}
                                        >
                                            <option value="">Seleccionar subsistema</option>
                                            {subsistemasDisponibles.map((sub) => (
                                                <option
                                                    key={sub.codigo}
                                                    value={sub.codigo}
                                                >
                                                    {sub.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="campo">
                                        <label htmlFor="criticidad">Criticidad</label>
                                        <select
                                            className="control"
                                            id="criticidad"
                                            value={nuevoBorrador.criticidad}
                                            onChange={(e) =>
                                                actualizarBorrador('criticidad', e.target.value)
                                            }
                                        >
                                            <option value="">Seleccionar criticidad</option>
                                            {catalogos.criticidades
                                                .filter((c) => c.activo)
                                                .map((c) => (
                                                    <option
                                                        key={c.codigo}
                                                        value={c.codigo}
                                                    >
                                                        {c.nombre}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    <div className="campo">
                                        <label htmlFor="tipoProblema">
                                            Tipo de problema
                                        </label>
                                        <select
                                            className="control"
                                            id="tipoProblema"
                                            value={nuevoBorrador.tipoProblema}
                                            onChange={(e) =>
                                                actualizarBorrador('tipoProblema', e.target.value)
                                            }
                                        >
                                            <option value="">Seleccionar tipo</option>
                                            {catalogos.tiposProblema
                                                .filter((t) => t.activo)
                                                .map((tipo) => (
                                                    <option
                                                        key={tipo.codigo}
                                                        value={tipo.codigo}
                                                    >
                                                        {tipo.nombre}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="campo">
                                    <label htmlFor="descripcion">Descripción</label>
                                    <textarea
                                        className="control"
                                        id="descripcion"
                                        value={nuevoBorrador.descripcion}
                                        onChange={(e) =>
                                            actualizarBorrador('descripcion', e.target.value)
                                        }
                                    />
                                </div>

                                <div className="fila">
                                    <button
                                        className="btn btn-primario"
                                        type="submit"
                                        disabled={!nuevoBorrador.titulo.trim()}
                                    >
                                        Guardar borrador
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {borradores.length === 0 ? (
                        <div className="vacio">
                            <p>No tenés borradores guardados.</p>
                            <p>
                                Mientras cargás un ticket podés guardarlo como
                                borrador y terminarlo después.
                            </p>
                        </div>
                    ) : (
                        <div className="tabla-envoltura">
                            <table className="tabla responsive">
                                <thead>
                                    <tr>
                                        <th>Título</th>
                                        <th>Localidad</th>
                                        <th>Criticidad</th>
                                        <th>Acción</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {borradores.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td className="titulo-celda">
                                                {ticket.titulo}
                                            </td>
                                            <td>
                                                {nombreLocalidad(ticket.localidadId)}
                                            </td>
                                            <td>
                                                {ticket.criticidad || 'Sin definir'}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-secundario btn-sm"
                                                    type="button"
                                                >
                                                    Ver borrador
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}

export default Inicio;