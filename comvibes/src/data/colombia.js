export const DEPARTAMENTOS = [
  { id: 'ANT', nombre: 'Antioquia', municipios: ['Medellín','Bello','Itagüí','Envigado','Rionegro','Apartadó','Turbo','Caucasia','Marinilla','La Estrella','Caldas','Copacabana','Sabaneta','Barbosa'] },
  { id: 'ATL', nombre: 'Atlántico', municipios: ['Barranquilla','Soledad','Malambo','Sabanalarga','Baranoa','Puerto Colombia','Galapa','Santo Tomás','Tubará'] },
  { id: 'BOG', nombre: 'Bogotá D.C.', municipios: ['Bogotá'] },
  { id: 'BOL', nombre: 'Bolívar', municipios: ['Cartagena','Magangué','El Carmen de Bolívar','Mompox','Arjona','San Juan Nepomuceno','Turbaco','Zambrano'] },
  { id: 'BOY', nombre: 'Boyacá', municipios: ['Tunja','Duitama','Sogamoso','Chiquinquirá','Paipa','Villa de Leyva','Aquitania','Moniquirá','Ramiriquí'] },
  { id: 'CAL', nombre: 'Caldas', municipios: ['Manizales','La Dorada','Riosucio','Villamaría','Chinchiná','Palestina','Salamina','Anserma'] },
  { id: 'CAQ', nombre: 'Caquetá', municipios: ['Florencia','San Vicente del Caguán','Puerto Rico','El Doncello','La Montañita','Cartagena del Chairá'] },
  { id: 'CAS', nombre: 'Casanare', municipios: ['Yopal','Aguazul','Villanueva','Tauramena','Paz de Ariporo','Monterrey','Pore','Trinidad'] },
  { id: 'CAU', nombre: 'Cauca', municipios: ['Popayán','Santander de Quilichao','Puerto Tejada','Patía','Timbío','Caloto','Corinto'] },
  { id: 'CES', nombre: 'Cesar', municipios: ['Valledupar','Aguachica','Bosconia','Codazzi','El Copey','La Paz','Pelaya','San Alberto'] },
  { id: 'CHO', nombre: 'Chocó', municipios: ['Quibdó','Istmina','Tadó','Condoto','Riosucio','Acandí','Bajo Baudó'] },
  { id: 'COR', nombre: 'Córdoba', municipios: ['Montería','Cereté','Lorica','Sahagún','Tierralta','Montelíbano','Ciénaga de Oro','San Pelayo'] },
  { id: 'CUN', nombre: 'Cundinamarca', municipios: ['Soacha','Fusagasugá','Facatativá','Zipaquirá','Chía','Mosquera','Madrid','Funza','Sibaté','La Mesa','Girardot','Cajicá','Sopó'] },
  { id: 'GUV', nombre: 'Guaviare', municipios: ['San José del Guaviare','Calamar','El Retorno','Miraflores'] },
  { id: 'HUI', nombre: 'Huila', municipios: ['Neiva','Pitalito','Garzón','La Plata','Campoalegre','Rivera','Palermo','Timaná','San Agustín','Isnos','Algeciras','Acevedo','Aipe','Tesalia'] },
  { id: 'LAG', nombre: 'La Guajira', municipios: ['Riohacha','Maicao','Uribia','Manaure','Fonseca','Barrancas','San Juan del Cesar','Albania'] },
  { id: 'MAG', nombre: 'Magdalena', municipios: ['Santa Marta','Ciénaga','Fundación','El Banco','Plato','Aracataca','Pivijay'] },
  { id: 'MET', nombre: 'Meta', municipios: ['Villavicencio','Acacías','Granada','Cumaral','Puerto López','Restrepo','San Martín'] },
  { id: 'NAR', nombre: 'Nariño', municipios: ['Pasto','Tumaco','Ipiales','Túquerres','La Unión','Samaniego','El Charco','Barbacoas'] },
  { id: 'NSA', nombre: 'Norte de Santander', municipios: ['Cúcuta','Ocaña','Pamplona','Villa del Rosario','Los Patios','El Zulia','Tibú','Sardinata'] },
  { id: 'PUT', nombre: 'Putumayo', municipios: ['Mocoa','Puerto Asís','Orito','Valle del Guamuez','Sibundoy','Puerto Leguízamo'] },
  { id: 'QUI', nombre: 'Quindío', municipios: ['Armenia','Calarcá','Montenegro','La Tebaida','Quimbaya','Génova','Salento'] },
  { id: 'RIS', nombre: 'Risaralda', municipios: ['Pereira','Dosquebradas','Santa Rosa de Cabal','Quinchía','Belén de Umbría','La Virginia','Marsella'] },
  { id: 'SAP', nombre: 'San Andrés y Providencia', municipios: ['San Andrés','Providencia'] },
  { id: 'SAN', nombre: 'Santander', municipios: ['Bucaramanga','Floridablanca','Girón','Piedecuesta','Barrancabermeja','San Gil','Socorro','Vélez','Málaga','Lebrija'] },
  { id: 'SUC', nombre: 'Sucre', municipios: ['Sincelejo','Corozal','San Marcos','Sampués','Tolú','Ovejas','San Onofre'] },
  { id: 'TOL', nombre: 'Tolima', municipios: ['Ibagué','Espinal','Melgar','Honda','Chaparral','Líbano','Mariquita','Planadas'] },
  { id: 'VAC', nombre: 'Valle del Cauca', municipios: ['Cali','Buenaventura','Palmira','Tuluá','Buga','Cartago','Yumbo','Jamundí','Candelaria','Dagua','Zarzal'] },
  { id: 'VAU', nombre: 'Vaupés', municipios: ['Mitú','Carurú','Taraira'] },
  { id: 'VID', nombre: 'Vichada', municipios: ['Puerto Carreño','La Primavera','Santa Rosalía','Cumaribo'] },
  { id: 'AMA', nombre: 'Amazonas', municipios: ['Leticia','Puerto Nariño','La Pedrera','Tarapacá'] },
  { id: 'ARA', nombre: 'Arauca', municipios: ['Arauca','Tame','Saravena','Arauquita','Fortul','Puerto Rondón'] },
]

export const getMunicipios = (depId) => {
  const dep = DEPARTAMENTOS.find(d => d.id === depId)
  return dep ? dep.municipios : []
}
