from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_alter_registereddevice_device_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='simulationsession',
            name='registered_id',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
