const router = require('express').Router();
const Event = require('../models/Event');
const City = require('../models/City');
const Promoter = require('../models/Promoter');
const checkPromoterToken = require('../middleware/checkPromoterToken');
const admin = require('firebase-admin');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');


router.post('/create', checkPromoterToken, async (req, res) => {
  try {
    const {
      title,
      street,
      number,
      place_name,
      cityId,
      //cityName,
      description,
      entrance_price,
      organized_by,
      artists,
      for_adults_only,
      likesCount,
      start_date,
      end_date,
      start_time,
      end_time,
      paymentInfo,
      socialMedia,
      created,
      updated,
      isFeatured
    } = req.body;
    
  
    
    const promoterId = req.promoter._id; // Promoter ID obtained from the token
    const promoterData = await Promoter.findById(promoterId);
    if (!promoterData) {
      return res.status(404).json({ error: "Promoter not found" });
    }
    
    const cityData = await City.findById(cityId);
    
    if (!cityData) {
      return res.status(404).json({ error: "City not found" });
    }
    const name =  cityData.cityName;

    const event = new Event({
      title,
      cityId: cityData._id,
      cityName: name,
      street,
      number,
      place_name,
      description,
      entrance_price,
      organized_by,
      for_adults_only,
      likesCount,
      artists,
      socialMedia,
      paymentInfo,
      start_date,
      end_date,
      start_time,
      end_time,
      created,
      updated,
      promoter: promoterData._id, // Associate the event with the Promoter by setting the "Promoter" field to the Promoter's ID
      isFeatured
    });

    // Verificar se foi enviado um arquivo de banner
    if (req.files && req.files.bannerFile) {
      const bannerFile = req.files.bannerFile;

      // Upload do banner para o Firebase Storage
      const bucket = admin.storage().bucket();
      const bannerPath = `banners/${promoterId}-${uuidv4()}_${bannerFile.name}`;
      const bannerFileRef = bucket.file(bannerPath);
      const bannerFileOptions = {
        metadata: {
          contentType: bannerFile.mimetype
        }
      };
      await bannerFileRef.save(bannerFile.data, bannerFileOptions);

      // Atualizar a URL do banner com o caminho no Firebase Storage
      event.bannerUrl = `https://storage.googleapis.com/${bucket.name}/${bannerPath}`;

    }


    // Verificar se foram enviadas fotos para a galeria
    if (req.files && req.files.galerie) {
      const galerieFiles = Array.isArray(req.files.galerie) ? req.files.galerie : [req.files.galerie];

      // Fazer o upload das fotos da galeria para o Firebase Storage
      const galerieUrls = [];
      for (
        let index = 0; index < galerieFiles.length; index++) {
        const galerieFile = galerieFiles[index];
        const galeriePath = `galerie/${promoterId}-${uuidv4()}_${bannerFile.name}`;
        const galerieFileRef = bucket.file(galeriePath);
        const galerieFileOptions = {
          metadata: {
            contentType: galerieFile.mimetype
          }
        };
        await galerieFileRef.save(galerieFile.data, galerieFileOptions);
        galerieUrls.push(`https://storage.googleapis.com/${bucket.name}/${galeriePath}`)

        // Atualizar as URLs da galeria com os caminhos no Firebase Storage
        event.photoGallery = galerieUrls;
      }

    }
    const savedEvent = await event.save();
    if (savedEvent === 0) {
     return res.status(200).json({ msg: `${savedEvent.name} Created Sucessfuly!` });
    }
  } catch (error) {
    console.log(`Erro ao criar Event: ${error}`)
    res.status(500).json({ msg: "Erro ao cadastrar o evento, tente novamente mais tarde!" })
  }
});

///
router.get('/fetch', async (req, res) => {
  try {
    const events = await Event.find({}).select('-isFeatured').populate('cityId');
    if (events.length === 0) {
      return res.status(404).json({ msg: "Events not found" });

    }
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
    return [];
  }
});

router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const event = await Event.findById(id, '-isFeatured').populate('city','cityName');
    if (!event) {
      res.status(404).json({ msg: `Event not found for id ${id}` });
      return [];
    }
    res.status(200).json(event)
  } catch (error) {
    res.status(500).json({ error: error })
  }
});


router.get('/fetchEventByPromoter/:promoterId', async (req, res) => {
  try {
    const promoterId = req.params.promoterId;
    const events = await Event.find({ promoter: promoterId }).select('-isFeatured').populate('cityId');
    if (events.length === 0) {
      return res.status(404).json({ msg: "You dont have Event" });
    }
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get('/fetchEventByCity/:city', async (req, res) => {
  try {
    const city = req.params.city;

    const events = await Event.find({ city: city }).select('-isFeatured');;

    if (events.length === 0) {
      return res.status(404).json({ msg: "No events found for this city" });
    }

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fetchEventsForAdults/:for_adults_only?', async (req, res) => {
  try {
    const forAdultsOnly = req.params.for_adults_only || true;

    const events = await Event.find({ for_adults_only: forAdultsOnly }).select('-isFeatured').populate('cityId');

    if (events.length === 0) {
      return res.status(404).json({ msg: "Nenhum evento para adultos encontrado" });
    }

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fetchEventIsFeatured/:isFeatured', async (req, res) => {
  try {
    const isFeatured = req.params.isFeatured;

    const events = await Event.find({ isFeatured: isFeatured }).select('-isFeatured').populate('cityId');
    console.log(events)

    if (events.length === 0) {
      return res.status(404).json({ msg: `No Featured events so far` });

    }

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fetchEventByOrganizedBy/:organized_by', async (req, res) => {
  try {
    const organized_by = req.params.organized_by;

    const events = await Event.find({ organized_by: organized_by }).select('-isFeatured').populate('cityId');

    if (events.length === 0) {
      return res.status(404).json({ msg: `${organized_by} has not organized any events so far` });

    }

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/fetchEventByDateRange/:startDate/:endDate', async (req, res) => {
  try {
    const startDate = req.params.startDate;
    const endDate = req.params.endDate;

    const events = await Event.find({
      start_date: { $gte: startDate },
      end_date: { $lte: endDate }
    }).select('-isFeatured');

    if (events.length === 0) {
      return res.status(404).json({ msg: "No events found within the date range" }).populate('cityId');
    }

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/editEvent/:eventId', checkPromoterToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const eventData = req.body;

    // Verificar se o evento existe
    const event = await Event.findById(eventId).select('-isFeatured').populate('cityId');
    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }

    // Verificar se o Promoter tem permissão para editar o evento
    if (event.promoter.toString() !== req.promoter._id) {
      console.log(event.promoter.toString())
      return res.status(403).json({ msg: "Unauthorized access" });
    }

    // Atualizar os dados do evento
    event.title = eventData.title;
    event.city = eventData.city;
    event.street = eventData.street;
    event.number = eventData.number;
    event.place_name = eventData.place_name;
    event.description = eventData.description;
    event.entrance_price = eventData.entrance_price;
    event.organized_by = eventData.organized_by;
    event.for_adults_only = eventData.for_adults_only;
    event.start_date = eventData.start_date;
    event.end_date = eventData.end_date;
    event.start_time = eventData.start_time;
    event.end_time = eventData.end_time;
    event.updated = Date.now();

    // Salvar as alterações no banco de dados
    const updatedEvent = await event.save();

    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/deleteEvent/:eventId', checkPromoterToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;

    // Check if the event exists
    const event = await Event.findById(eventId).select('-isFeatured');
    if (!event) {
      return res.status(404).json({ msg: "Event not found" });
    }

    // Verificar se o Promoter tem permissão para editar o evento
    if (event.promoter.toString() !== req.promoter._id) {
      console.log(event.promoter.toString())
      return res.status(403).json({ msg: "Unauthorized access" });
    }
    // Delete the event
    await Event.deleteOne({ _id: eventId });

    res.status(200).json({ msg: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
