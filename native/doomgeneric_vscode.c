#include "doomgeneric/doomgeneric/doomkeys.h"
#include "doomgeneric/doomgeneric/doomgeneric.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/time.h>
#include <errno.h>

#define KEYQUEUE_SIZE 32

static unsigned short s_KeyQueue[KEYQUEUE_SIZE];
static unsigned int s_KeyQueueWriteIndex = 0;
static unsigned int s_KeyQueueReadIndex = 0;

static struct timeval s_StartTime;
static uint32_t s_FrameNum = 0;

static const char FRAME_MAGIC[4] = {'D', 'O', 'O', 'M'};

static void addKeyToQueue(int pressed, unsigned char key)
{
    unsigned short keyData = (pressed << 8) | key;
    s_KeyQueue[s_KeyQueueWriteIndex] = keyData;
    s_KeyQueueWriteIndex++;
    s_KeyQueueWriteIndex %= KEYQUEUE_SIZE;
}

static void pollStdinKeys(void)
{
    unsigned char buf[3];
    while (1)
    {
        ssize_t n = read(STDIN_FILENO, buf, 3);
        if (n < 3) break;
        if (buf[0] == 'K')
        {
            addKeyToQueue(buf[1], buf[2]);
        }
    }
}

void DG_Init()
{
    memset(s_KeyQueue, 0, KEYQUEUE_SIZE * sizeof(unsigned short));
    gettimeofday(&s_StartTime, NULL);

    // Set stdin to non-blocking
    int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
    fcntl(STDIN_FILENO, F_SETFL, flags | O_NONBLOCK);

    // Set stdout to fully buffered with large buffer for frame writes
    setvbuf(stdout, NULL, _IOFBF, 2 * 1024 * 1024);
}

void DG_DrawFrame()
{
    // Write frame: magic(4) + frameNum(4) + pixels(640*400*4)
    fwrite(FRAME_MAGIC, 1, 4, stdout);
    fwrite(&s_FrameNum, 4, 1, stdout);
    fwrite(DG_ScreenBuffer, 4, DOOMGENERIC_RESX * DOOMGENERIC_RESY, stdout);
    fflush(stdout);
    s_FrameNum++;

    // Poll for key input
    pollStdinKeys();
}

void DG_SleepMs(uint32_t ms)
{
    usleep(ms * 1000);
}

uint32_t DG_GetTicksMs()
{
    struct timeval tp;
    gettimeofday(&tp, NULL);
    return (uint32_t)((tp.tv_sec - s_StartTime.tv_sec) * 1000 +
                      (tp.tv_usec - s_StartTime.tv_usec) / 1000);
}

int DG_GetKey(int* pressed, unsigned char* doomKey)
{
    if (s_KeyQueueReadIndex == s_KeyQueueWriteIndex)
    {
        return 0;
    }
    else
    {
        unsigned short keyData = s_KeyQueue[s_KeyQueueReadIndex];
        s_KeyQueueReadIndex++;
        s_KeyQueueReadIndex %= KEYQUEUE_SIZE;

        *pressed = keyData >> 8;
        *doomKey = keyData & 0xFF;

        return 1;
    }
}

void DG_SetWindowTitle(const char *title)
{
    // No window title in VSCode mode
    (void)title;
}

int main(int argc, char **argv)
{
    doomgeneric_Create(argc, argv);

    while (1)
    {
        doomgeneric_Tick();
    }

    return 0;
}
