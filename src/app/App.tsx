import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, useScroll } from 'motion/react';
import { MapPin, Clock, Calendar, Heart, X } from 'lucide-react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export default function App() {
  type AttendanceStatus = 'yes' | 'no';

  type RsvpItem = {
    id: string;
    name: string;
    attendance: AttendanceStatus;
    message: string;
    createdAt?: Timestamp;
  };

  const [showContent, setShowContent] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const audioRef = useRef<HTMLAudioElement>(null);
  const { scrollYProgress } = useScroll();

  const weddingDate = new Date('2026-05-31T09:00:00');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = weddingDate.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  const [formData, setFormData] = useState<{
    name: string;
    attendance: AttendanceStatus;
    message: string;
  }>({
    name: '',
    attendance: 'yes',
    message: ''
  });
  const [rsvps, setRsvps] = useState<RsvpItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [dashboardFilter, setDashboardFilter] = useState<'all' | AttendanceStatus>('all');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const isDashboardPage = window.location.pathname === '/dashboard';

  useEffect(() => {
    const rsvpQuery = query(collection(db, 'rsvps'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(rsvpQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          name: docData.name ?? 'Anonim',
          attendance: docData.attendance === 'no' ? 'no' : 'yes',
          message: docData.message ?? '',
          createdAt: docData.createdAt
        } as RsvpItem;
      });
      setRsvps(data);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');

    try {
      await addDoc(collection(db, 'rsvps'), {
        name: formData.name.trim(),
        attendance: formData.attendance,
        message: formData.message.trim(),
        createdAt: serverTimestamp()
      });
      setSubmitStatus('Terima kasih, konfirmasi kehadiran berhasil dikirim.');
    } catch (error) {
      console.error('Gagal menyimpan RSVP:', error);
      setSubmitStatus('Maaf, konfirmasi gagal dikirim. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }

    setFormData({ name: '', attendance: 'yes', message: '' });
  };

  const handleDeleteRsvp = (rsvpId: string, guestName: string) => {
    setPendingDelete({ id: rsvpId, name: guestName });
  };

  const confirmDeleteRsvp = async () => {
    if (!pendingDelete) {
      return;
    }

    setDeletingId(pendingDelete.id);
    try {
      await deleteDoc(doc(db, 'rsvps', pendingDelete.id));
      setPendingDelete(null);
    } catch (error) {
      console.error('Gagal menghapus RSVP:', error);
      window.alert('Maaf, pesan gagal dihapus. Silakan coba lagi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenInvitation = () => {
    setShowContent(true);
    if (audioRef.current) {
      audioRef.current.play().catch(error => {
        console.log('Audio play failed:', error);
      });
    }
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImage(null);
        setPendingDelete(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const openImageModal = (src: string, alt: string) => {
    setSelectedImage({ src, alt });
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const fadeInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const fadeInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  const attendanceSummary = rsvps.reduce(
    (acc, item) => {
      if (item.attendance === 'yes') {
        acc.yes += 1;
      } else {
        acc.no += 1;
      }
      return acc;
    },
    { yes: 0, no: 0 }
  );

  const filteredDashboardRsvps = rsvps.filter((item) => {
    const byAttendance = dashboardFilter === 'all' || item.attendance === dashboardFilter;
    const byName = item.name.toLowerCase().includes(dashboardSearch.trim().toLowerCase());
    return byAttendance && byName;
  });

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'Waktu belum tersedia';
    return timestamp.toDate().toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isDashboardPage) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl mb-3 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Dashboard RSVP
            </h1>
            <p className="text-sm text-[#5C4A3A]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Monitoring kehadiran dan pesan dari tamu
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl shadow-lg p-6 text-center">
              <p className="text-sm text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>Total Konfirmasi</p>
              <p className="text-4xl text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>{rsvps.length}</p>
            </div>
            <div className="bg-white rounded-3xl shadow-lg p-6 text-center">
              <p className="text-sm text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>Hadir</p>
              <p className="text-4xl text-green-700" style={{ fontFamily: 'Playfair Display, serif' }}>{attendanceSummary.yes}</p>
            </div>
            <div className="bg-white rounded-3xl shadow-lg p-6 text-center">
              <p className="text-sm text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>Tidak Hadir</p>
              <p className="text-4xl text-red-700" style={{ fontFamily: 'Playfair Display, serif' }}>{attendanceSummary.no}</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg p-8">
            <h2 className="text-2xl mb-6 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Pesan Tamu
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <input
                type="text"
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                placeholder="Cari nama tamu..."
                className="flex-1 px-4 py-3 rounded-2xl border border-[#E8DFD4] focus:outline-none focus:border-[#8B7355] bg-[#FAF8F5]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setDashboardFilter('all')} className={`px-3 py-2 rounded-xl text-xs ${dashboardFilter === 'all' ? 'bg-[#2C2416] text-white' : 'bg-[#FAF8F5] text-[#2C2416] border border-[#E8DFD4]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>Semua</button>
                <button type="button" onClick={() => setDashboardFilter('yes')} className={`px-3 py-2 rounded-xl text-xs ${dashboardFilter === 'yes' ? 'bg-green-700 text-white' : 'bg-[#FAF8F5] text-[#2C2416] border border-[#E8DFD4]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>Hadir</button>
                <button type="button" onClick={() => setDashboardFilter('no')} className={`px-3 py-2 rounded-xl text-xs ${dashboardFilter === 'no' ? 'bg-red-700 text-white' : 'bg-[#FAF8F5] text-[#2C2416] border border-[#E8DFD4]'}`} style={{ fontFamily: 'Inter, sans-serif' }}>Tidak</button>
              </div>
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {filteredDashboardRsvps.length === 0 && (
                <p className="text-sm text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Data tidak ditemukan untuk filter saat ini.
                </p>
              )}
              {filteredDashboardRsvps.map((item) => (
                <div key={item.id} className="border border-[#E8DFD4] rounded-2xl p-4 bg-[#FAF8F5]">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-base text-[#2C2416]" style={{ fontFamily: 'Inter, sans-serif' }}>{item.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full ${item.attendance === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {item.attendance === 'yes' ? 'Hadir' : 'Tidak Hadir'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRsvp(item.id, item.name)}
                        disabled={deletingId === item.id}
                        className="text-xs px-3 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[#5C4A3A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {item.message || 'Tidak ada pesan.'}
                  </p>
                  <p className="text-xs text-[#8B7355] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {pendingDelete && (
          <div className="fixed inset-0 z-[120] bg-black/45 flex items-center justify-center p-4" onClick={() => setPendingDelete(null)}>
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl text-[#2C2416] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Hapus Pesan?
              </h3>
              <p className="text-sm text-[#5C4A3A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                Pesan dari <span className="font-semibold">{pendingDelete.name}</span> akan dihapus permanen.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  disabled={deletingId === pendingDelete.id}
                  className="flex-1 px-4 py-3 rounded-full border border-[#E8DFD4] text-[#2C2416] bg-[#FAF8F5] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRsvp}
                  disabled={deletingId === pendingDelete.id}
                  className="flex-1 px-4 py-3 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {deletingId === pendingDelete.id ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] relative overflow-x-hidden">
      {/* Audio element */}
      <audio ref={audioRef} loop>
        <source src="/musik.mp3" type="audio/mpeg" />
      </audio>

      {/* Background Pattern */}
      <div
        className="fixed inset-0 opacity-5 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1762114974430-cdd69150c20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxvcmllbnRhbCUyMGluayUyMHBhaW50aW5nJTIwYmFtYm9vJTIwbWluaW1hbGlzdHxlbnwxfHx8fDE3NzY3ODY2MjR8MA&ixlib=rb-4.1.0&q=80&w=1080')`
        }}
      />

      {/* Scroll Progress Bar */}
      {showContent && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-[#8B7355] origin-left z-50"
          style={{ scaleX: scrollYProgress }}
        />
      )}

      <div className="relative max-w-md mx-auto">
        {!showContent ? (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen flex flex-col items-center justify-center px-6 relative"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-10"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1762114974430-cdd69150c20f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxvcmllbnRhbCUyMGluayUyMHBhaW50aW5nJTIwYmFtYm9vJTIwbWluaW1hbGlzdHxlbnwxfHx8fDE3NzY3ODY2MjR8MA&ixlib=rb-4.1.0&q=80&w=1080')`
              }}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-center relative z-10"
            >
              <div className="mb-8">
                <Heart className="w-12 h-12 mx-auto text-[#8B7355] mb-6" />
              </div>

              <h1 className="text-5xl mb-4 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Tiara & Harpan
              </h1>

              <div className="w-24 h-px bg-[#8B7355] mx-auto my-6" />

              <p className="text-lg mb-2 text-[#5C4A3A]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                31 Mei 2026
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOpenInvitation}
                className="mt-12 px-8 py-4 bg-[#2C2416] text-[#FAF8F5] rounded-full transition-all"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                Buka Undangan
              </motion.button>
            </motion.div>
          </motion.section>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            {/* Opening Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center"
            >
              <p className="text-2xl mb-6 text-[#2C2416]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ
              </p>
              <p className="text-lg mb-4 text-[#2C2416]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Bismillahirrahmanirrahim
              </p>
              <div className="w-16 h-px bg-[#8B7355] mx-auto my-6" />
              <p className="text-base text-[#5C4A3A] max-w-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              "Di antara tanda-tanda (kebesaran)-Nya ialah bahwa Dia menciptakan pasangan-pasangan untukmu dari (jenis) dirimu sendiri agar kamu merasa tenteram kepadanya. Dia menjadikan di antaramu rasa cinta dan kasih sayang. Sesungguhnya pada yang demikian itu benar-benar terdapat tanda-tanda (kebesaran Allah) bagi kaum yang berpikir" <br /> <br /> Surah Ar-Rum ayat 21
              </p>
            </motion.section>

            {/* Countdown Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={scaleIn}
              className="px-6"
            >
              <h2 className="text-3xl text-center mb-8 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Menghitung Mundur
              </h2>
              <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm mx-auto">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {timeLeft.days}
                    </div>
                    <div className="text-xs text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Hari
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {timeLeft.hours}
                    </div>
                    <div className="text-xs text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Jam
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {timeLeft.minutes}
                    </div>
                    <div className="text-xs text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Menit
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {timeLeft.seconds}
                    </div>
                    <div className="text-xs text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Detik
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Bride & Groom Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              className="px-6 py-16"
            >
              <div className="max-w-sm mx-auto space-y-12">
                {/* Bride */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                  variants={fadeInLeft}
                  className="text-center"
                >
                  <button
                    type="button"
                    onClick={() => openImageModal('/dummy.jpg', 'Bride')}
                    className="w-40 h-40 mx-auto mb-6 rounded-full overflow-hidden border-4 border-[#E8DFD4] shadow-lg block"
                  >
                    <ImageWithFallback
                      src="/dummy.jpg"
                      alt="Bride"
                      className="w-full h-full object-cover cursor-pointer"
                    />
                  </button>
                  <h3 className="text-2xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Tiara Skilla Amelia
                  </h3>
                  <p className="text-sm text-[#8B7355] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    Mempelai Wanita
                  </p>
                  <p className="text-sm text-[#5C4A3A] max-w-xs mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Putri dari Bapak Suban Kurniawan (Deni) & Ibu Neneng Solihat
                  </p>
                </motion.div>

                {/* Decorative Divider */}
                <div className="flex items-center justify-center">
                  <div className="w-12 h-px bg-[#8B7355]" />
                  <Heart className="w-6 h-6 mx-4 text-[#8B7355]" />
                  <div className="w-12 h-px bg-[#8B7355]" />
                </div>

                {/* Groom */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.5 }}
                  variants={fadeInRight}
                  className="text-center"
                >
                  <button
                    type="button"
                    onClick={() => openImageModal('/dummy.jpg', 'Groom')}
                    className="w-40 h-40 mx-auto mb-6 rounded-full overflow-hidden border-4 border-[#E8DFD4] shadow-lg block"
                  >
                    <ImageWithFallback
                      src="/dummy.jpg"
                      alt="Groom"
                      className="w-full h-full object-cover cursor-pointer"
                    />
                  </button>
                  <h3 className="text-2xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                    Muhamad Harpan Akbar
                  </h3>
                  <p className="text-sm text-[#8B7355] mb-3" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                    mempelai Laki-laki
                  </p>
                  <p className="text-sm text-[#5C4A3A] max-w-xs mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Putra dari Bapak Purnama & Ibu Halimah
                  </p>
                </motion.div>
              </div>
            </motion.section>

            {/* Wedding Details Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={scaleIn}
              className="px-6 py-16"
            >
              <h2 className="text-3xl text-center mb-10 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Detail Pernikahan
              </h2>
              <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm mx-auto space-y-6">
                <div className="flex items-start gap-4">
                  <Calendar className="w-6 h-6 text-[#8B7355] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#8B7355] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Tanggal
                    </p>
                    <p className="text-base text-[#2C2416]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      Minggu, 31 Mei 2026
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[#E8DFD4]" />

                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-[#8B7355] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#8B7355] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      AKAD NIKAH
                    </p>
                    <p className="text-base text-[#2C2416]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      09:00 WIB 
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-[#8B7355] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#8B7355] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      RESEPSI PERNIKAHAN
                    </p>
                    <p className="text-base text-[#2C2416]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      11:00 - 16:00 WIB
                    </p>
                  </div>
                </div>

                <div className="h-px bg-[#E8DFD4]" />

                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-[#8B7355] mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-[#8B7355] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Lokasi
                    </p>
                    <p className="font-bold text-base text-[#2C2416] mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                      Resort Oriental by Highlander Bogor
                    </p>
                    <p className="text-sm text-[#5C4A3A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Curug Nangka, Kec. Tamansari, Kab. Bogor
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Love Story Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeInUp}
              className="px-6 py-16"
            >
              <h2 className="text-3xl text-center mb-10 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Cerita Cinta Kami
              </h2>
              <div className="max-w-sm mx-auto space-y-8 relative">
                <div className="absolute left-6 top-8 bottom-8 w-px bg-[#E8DFD4]" />

                {/* First Meet */}
                <div className="flex gap-4 relative">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-[#8B7355] flex items-center justify-center flex-shrink-0 relative z-10">
                    <Heart className="w-5 h-5 text-[#8B7355]" />
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-[#8B7355] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Maret 2023
                    </p>
                    <h3 className="text-xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Pertemuan Pertama
                    </h3>
                    <p className="text-sm text-[#5C4A3A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Kami bertemu di acara teman bersama. Itu adalah cinta pada pertemuan pertama.
                    </p>
                  </div>
                </div>

                {/* Relationship */}
                <div className="flex gap-4 relative">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-[#8B7355] flex items-center justify-center flex-shrink-0 relative z-10">
                    <Heart className="w-5 h-5 text-[#8B7355]" />
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-[#8B7355] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Agustus 2023
                    </p>
                    <h3 className="text-xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Bersama
                    </h3>
                    <p className="text-sm text-[#5C4A3A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Perjalanan kami dimulai secara resmi. Setiap moment adalah berkah.
                    </p>
                  </div>
                </div>

                {/* Engagement */}
                <div className="flex gap-4 relative">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-[#8B7355] flex items-center justify-center flex-shrink-0 relative z-10">
                    <Heart className="w-5 h-5 text-[#8B7355]" />
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-[#8B7355] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Desember 2025
                    </p>
                    <h3 className="text-xl mb-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Akad Nikah
                    </h3>
                    <p className="text-sm text-[#5C4A3A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Di bawah langit musim dingin, kami berjanji untuk selamanya kepada satu sama lain.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* About Us Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              className="px-6 py-16"
            >
              <h2 className="text-3xl text-center mb-10 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Tentang Kami
              </h2>
              <div className="max-w-sm mx-auto">
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => openImageModal('/assets/1775917860563.png', 'Couple photo 1')} className="rounded-2xl overflow-hidden shadow-lg block">
                    <ImageWithFallback
                      src="/assets/1775917860563.png"
                      alt="Couple photo 1"
                      className="w-full h-48 object-cover grayscale cursor-pointer"
                    />
                  </button>
                  <button type="button" onClick={() => openImageModal('/assets/1775919752561.png', 'Couple photo 2')} className="rounded-2xl overflow-hidden shadow-lg block">
                    <ImageWithFallback
                      src="/assets/1775919752561.png"
                      alt="Couple photo 2"
                      className="w-full h-48 object-cover grayscale cursor-pointer"
                    />
                  </button>
                  <button type="button" onClick={() => openImageModal('/assets/file_000000002a1c71fab114be8ff4657569.png', 'Couple photo 3')} className="rounded-2xl overflow-hidden shadow-lg block">
                    <ImageWithFallback
                      src="/assets/file_000000002a1c71fab114be8ff4657569.png"
                      alt="Couple photo 3"
                      className="w-full h-48 object-cover grayscale cursor-pointer"
                    />
                  </button>
                  <button type="button" onClick={() => openImageModal('/assets/IMG_5948.png', 'Couple photo 4')} className="rounded-2xl overflow-hidden shadow-lg block">
                    <ImageWithFallback
                      src="/assets/IMG_5948.png"
                      alt="Couple photo 4"
                      className="w-full h-48 object-cover grayscale cursor-pointer"
                    />
                  </button>
                </div>
              </div>
            </motion.section>

            {/* Location Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              className="px-6 py-16"
            >
              <h2 className="text-3xl text-center mb-10 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Lokasi
              </h2>
              <div className="max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => openImageModal('/lok.jpeg', 'Wedding Venue')}
                  className="rounded-4xl overflow-hidden mb-6 opacity-10 block w-full"
                >
                  <ImageWithFallback
                    src="/lok.jpeg"
                    alt="Wedding Venue"
                    className="w-full h-64 object-cover cursor-pointer"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => window.open('https://maps.app.goo.gl/PDXp6znAiN16G4tV6?g_st=iw', '_blank', 'noopener,noreferrer')}
                  className="w-full px-6 py-4 bg-[#2C2416] text-[#FAF8F5] rounded-full transition-all hover:bg-[#3D3020] flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <MapPin className="w-5 h-5" />
                  Buka di Google Maps
                </button>
              </div>
            </motion.section>


            {/* RSVP Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={scaleIn}
              className="px-6 py-16"
            >
              <h2 className="text-3xl text-center mb-10 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                Konfirmasi Kehadiran
              </h2>
              <div className="max-w-sm mx-auto bg-white rounded-3xl shadow-lg p-8">
                <p className="text-center text-sm text-[#5C4A3A] mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Silahkan konfirmasi kehadiran Anda sebelum tanggal 31 Mei 2026
                </p>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm mb-2 text-[#2C2416]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Nama Anda
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border border-[#E8DFD4] focus:outline-none focus:border-[#8B7355] bg-[#FAF8F5]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#2C2416]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Apakah Anda akan hadir?
                    </label>
                    <div className="flex gap-4">
                      <label className="flex-1 flex items-center justify-center px-4 py-3 rounded-2xl border border-[#E8DFD4] cursor-pointer transition-all bg-[#FAF8F5] has-[:checked]:bg-[#2C2416] has-[:checked]:text-white has-[:checked]:border-[#2C2416]">
                        <input
                          type="radio"
                          name="attendance"
                          value="yes"
                          checked={formData.attendance === 'yes'}
                          onChange={() => setFormData({ ...formData, attendance: 'yes' })}
                          className="sr-only"
                        />
                        <span style={{ fontFamily: 'Inter, sans-serif' }}>Ya</span>
                      </label>
                      <label className="flex-1 flex items-center justify-center px-4 py-3 rounded-2xl border border-[#E8DFD4] cursor-pointer transition-all bg-[#FAF8F5] has-[:checked]:bg-[#2C2416] has-[:checked]:text-white has-[:checked]:border-[#2C2416]">
                        <input
                          type="radio"
                          name="attendance"
                          value="no"
                          checked={formData.attendance === 'no'}
                          onChange={() => setFormData({ ...formData, attendance: 'no' })}
                          className="sr-only"
                        />
                        <span style={{ fontFamily: 'Inter, sans-serif' }}>Tidak</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2 text-[#2C2416]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Pesan (Opsional)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl border border-[#E8DFD4] focus:outline-none focus:border-[#8B7355] resize-none bg-[#FAF8F5]"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full px-6 py-4 bg-[#2C2416] text-[#FAF8F5] rounded-full transition-all hover:bg-[#3D3020]"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Submit Konfirmasi Kehadiran'}
                  </button>
                </form>
                {submitStatus && (
                  <p className="text-center text-sm text-[#5C4A3A] mt-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {submitStatus}
                  </p>
                )}
              </div>

              <div className="max-w-sm mx-auto mt-6 bg-white rounded-3xl shadow-lg p-6">
                <h3 className="text-xl mb-4 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Ucapan & Pesan Tamu
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {rsvps.length === 0 && (
                    <p className="text-sm text-[#8B7355]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Belum ada pesan dari tamu.
                    </p>
                  )}
                  {rsvps.map((item) => (
                    <div key={item.id} className="border border-[#E8DFD4] rounded-2xl p-4 bg-[#FAF8F5]">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm text-[#2C2416]" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {item.name}
                        </p>
                        <span className={`text-[10px] px-2 py-1 rounded-full ${item.attendance === 'yes' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.attendance === 'yes' ? 'Hadir' : 'Tidak'}
                        </span>
                      </div>
                      <p className="text-sm text-[#5C4A3A]" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {item.message || 'Tidak ada pesan.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>


            {/* Closing Section */}
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeInUp}
              className="px-6 py-20 text-center"
            >
              <div className="max-w-sm mx-auto">
                <Heart className="w-10 h-10 mx-auto text-[#8B7355] mb-6" />
                <h2 className="text-3xl mb-6 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Terima Kasih
                </h2>
                <p className="text-base text-[#5C4A3A] mb-8 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Kehadiran Anda dan doa Anda sangat berarti bagi kami. Kami berharap dapat merayakan hari ini bersama Anda.
                </p>
                <div className="w-24 h-px bg-[#8B7355] mx-auto my-8" />
                <p className="text-sm text-[#8B7355]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                  Dengan cinta dan syukur,
                </p>
                <p className="text-lg mt-2 text-[#2C2416]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Tiara & Harpan
                </p>
              </div>
            </motion.section>
          </motion.div>
        )}
      </div>
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            aria-label="Tutup gambar"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-200"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
